"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import Navbar from "@/components/navbar";

type Playmate = {
  id: number;
  name: string;
  game: string;
  coinBalance: number;
};

type GiftRecord = {
  id: number;
  giftName: string;
  coinCost: number;
  createdAt: string;
  user: { discordName: string; discordId: string };
  playmate: { name: string };
};

type PlaymateTransaction = {
  id: number;
  amount: number;
  type: string;
  note?: string | null;
  createdAt: string;
  playmate: { name: string };
};

const readJson = async (res: Response) => {
  const text = await res.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const typeLabel: Record<string, string> = {
  order: "订单收入",
  gift: "礼物收入",
  admin: "Admin 调整",
};

export default function AdminCoinsPage() {
  const { data: session, status } = useSession();
  const [playmates, setPlaymates] = useState<Playmate[]>([]);
  const [transactions, setTransactions] = useState<PlaymateTransaction[]>([]);
  const [gifts, setGifts] = useState<GiftRecord[]>([]);
  const [adjustments, setAdjustments] = useState<Record<number, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const isAdmin = session?.user?.role === "admin";

  const loadData = async () => {
    const [playmatesRes, transactionsRes, giftsRes] = await Promise.all([
      fetch("/api/playmates", { cache: "no-store" }),
      fetch("/api/playmate-transactions", { cache: "no-store" }),
      fetch("/api/gifts", { cache: "no-store" }),
    ]);
    const [playmatesData, transactionsData, giftsData] = await Promise.all([
      readJson(playmatesRes),
      readJson(transactionsRes),
      readJson(giftsRes),
    ]);

    if (!playmatesRes.ok) {
      setMessage(playmatesData?.error ?? "无法读取陪玩资料。");
      return;
    }

    if (!transactionsRes.ok) {
      setMessage(transactionsData?.error ?? "无法读取金币流水。");
      return;
    }

    if (!giftsRes.ok) {
      setMessage(giftsData?.error ?? "无法读取礼物记录。");
      return;
    }

    setPlaymates(Array.isArray(playmatesData) ? playmatesData : []);
    setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
    setGifts(Array.isArray(giftsData) ? giftsData : []);
    setMessage(null);
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      void signIn("discord", { callbackUrl: "/admin/coins" });
      return;
    }

    if (status === "authenticated" && isAdmin) {
      queueMicrotask(() => void loadData());
    }
  }, [isAdmin, status]);

  const totals = useMemo(() => {
    return transactions.reduce(
      (summary, transaction) => ({
        total: summary.total + transaction.amount,
        order: summary.order + (transaction.type === "order" ? transaction.amount : 0),
        gift: summary.gift + (transaction.type === "gift" ? transaction.amount : 0),
        admin: summary.admin + (transaction.type === "admin" ? transaction.amount : 0),
      }),
      { total: 0, order: 0, gift: 0, admin: 0 },
    );
  }, [transactions]);

  const adjustCoins = async (playmate: Playmate) => {
    const amount = Number(adjustments[playmate.id]);

    if (!Number.isInteger(amount) || amount === 0) {
      setMessage("请输入非 0 的整数金币数量。扣除请填负数。");
      return;
    }

    const res = await fetch(`/api/playmates/${playmate.id}/coins`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    const data = await readJson(res);

    if (!res.ok) {
      setMessage(data?.error ?? "无法调整陪玩金币。");
      return;
    }

    setAdjustments((prev) => ({ ...prev, [playmate.id]: "" }));
    setMessage("陪玩金币已调整。");
    await loadData();
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-300">
            Admin Coins
          </p>
          <h1 className="mt-2 text-4xl font-black">金币流水管理</h1>
          <p className="mt-3 text-sm text-zinc-400">
            admin 可以查看所有陪玩的订单、礼物、手动调整流水，也可以直接加扣陪玩金币。
          </p>
        </div>

        {!isAdmin && status === "authenticated" && (
          <div className="rounded-lg border border-red-500/40 bg-red-950/20 p-6 text-red-200">
            只有管理员可以查看金币流水管理。
          </div>
        )}

        {message && (
          <p className="mb-5 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-cyan-200">
            {message}
          </p>
        )}

        {isAdmin && (
          <>
            <div className="mb-6 grid gap-4 md:grid-cols-4">
              <div className="rounded-lg border border-yellow-400/40 bg-zinc-950 p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">总流水</p>
                <p className="mt-2 text-3xl font-black text-yellow-200">{totals.total}</p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">订单收入</p>
                <p className="mt-2 text-2xl font-black text-emerald-200">{totals.order}</p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">礼物收入</p>
                <p className="mt-2 text-2xl font-black text-emerald-200">{totals.gift}</p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Admin 调整</p>
                <p className={totals.admin >= 0 ? "mt-2 text-2xl font-black text-emerald-200" : "mt-2 text-2xl font-black text-red-200"}>
                  {totals.admin}
                </p>
              </div>
            </div>

            <section className="mb-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="text-2xl font-black">陪玩金币</h2>
              <div className="mt-4 grid gap-3">
                {playmates.map((playmate) => (
                  <article
                    key={playmate.id}
                    className="grid gap-3 rounded-lg border border-zinc-800 bg-black p-4 md:grid-cols-[1fr_140px_180px_auto] md:items-center"
                  >
                    <div>
                      <h3 className="text-lg font-bold">{playmate.name}</h3>
                      <p className="text-sm text-cyan-300">{playmate.game}</p>
                    </div>
                    <p className="font-black text-yellow-200">{playmate.coinBalance} 金币</p>
                    <input
                      value={adjustments[playmate.id] ?? ""}
                      onChange={(event) =>
                        setAdjustments((prev) => ({ ...prev, [playmate.id]: event.target.value }))
                      }
                      type="number"
                      placeholder="+10 / -5"
                      className="min-h-11 rounded-lg border border-zinc-700 bg-zinc-950 px-4 text-white outline-none focus:border-cyan-300"
                    />
                    <button
                      type="button"
                      onClick={() => void adjustCoins(playmate)}
                      className="rounded-lg border border-yellow-400/60 px-5 py-3 text-sm font-black text-yellow-100 transition hover:bg-yellow-300 hover:text-black"
                    >
                      调整
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
                <h2 className="text-2xl font-black">金币流水</h2>
                <div className="mt-4 grid gap-2">
                  {transactions.map((transaction) => (
                    <article key={transaction.id} className="rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm">
                      <p className={transaction.amount >= 0 ? "font-bold text-emerald-200" : "font-bold text-red-200"}>
                        {transaction.playmate.name} · {transaction.amount >= 0 ? "+" : ""}
                        {transaction.amount} 金币 · {typeLabel[transaction.type] ?? transaction.type}
                      </p>
                      <p className="mt-1 text-zinc-500">
                        {transaction.note ?? "无备注"} · {new Date(transaction.createdAt).toLocaleString()}
                      </p>
                    </article>
                  ))}
                  {transactions.length === 0 && <p className="text-sm text-zinc-500">暂无金币流水。</p>}
                </div>
              </section>

              <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
                <h2 className="text-2xl font-black">礼物记录</h2>
                <div className="mt-4 grid gap-2">
                  {gifts.map((gift) => (
                    <article key={gift.id} className="rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm">
                      <p className="font-bold text-yellow-200">
                        {gift.user.discordName} 送 {gift.giftName} 给 {gift.playmate.name}
                      </p>
                      <p className="mt-1 text-zinc-500">
                        {gift.coinCost} 金币 · {new Date(gift.createdAt).toLocaleString()}
                      </p>
                    </article>
                  ))}
                  {gifts.length === 0 && <p className="text-sm text-zinc-500">暂无礼物记录。</p>}
                </div>
              </section>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
