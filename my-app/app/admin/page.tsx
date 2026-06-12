"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/navbar";
import { signIn, useSession } from "next-auth/react";

type Playmate = {
  id: number;
  name: string;
  game: string;
  price: number;
  description: string;
  image?: string | null;
  discordId?: string | null;
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

type RechargeRequest = {
  id: number;
  amount: number;
  transferName: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  reviewedAt?: string | null;
  user: {
    discordName: string;
    discordId: string;
    coinBalance: number;
  };
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

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [playmates, setPlaymates] = useState<Playmate[]>([]);
  const [discordIds, setDiscordIds] = useState<Record<number, string>>({});
  const [coinAdjustments, setCoinAdjustments] = useState<Record<number, string>>({});
  const [gifts, setGifts] = useState<GiftRecord[]>([]);
  const [transactions, setTransactions] = useState<PlaymateTransaction[]>([]);
  const [rechargeRequests, setRechargeRequests] = useState<RechargeRequest[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const isAdmin = session?.user?.role === "admin";

  const loadPlaymates = async () => {
    const res = await fetch("/api/playmates", { cache: "no-store" });
    const data = await readJson(res);

    if (!res.ok) {
      setMessage(data?.error ?? "无法读取陪玩列表。");
      return;
    }

    const playmateData = Array.isArray(data) ? data : [];
    setPlaymates(playmateData);
    setDiscordIds(
      Object.fromEntries(playmateData.map((playmate: Playmate) => [playmate.id, playmate.discordId ?? ""])),
    );
  };

  const loadAdminRecords = async () => {
    const [giftsRes, transactionsRes, rechargeRes] = await Promise.all([
      fetch("/api/gifts", { cache: "no-store" }),
      fetch("/api/playmate-transactions", { cache: "no-store" }),
      fetch("/api/recharge-requests", { cache: "no-store" }),
    ]);
    const [giftsData, transactionsData, rechargeData] = await Promise.all([
      readJson(giftsRes),
      readJson(transactionsRes),
      readJson(rechargeRes),
    ]);

    if (!giftsRes.ok) {
      setMessage(giftsData?.error ?? "无法读取礼物记录。");
    }

    if (!transactionsRes.ok) {
      setMessage(transactionsData?.error ?? "无法读取陪玩业绩流水。");
    }

    if (!rechargeRes.ok) {
      setMessage(rechargeData?.error ?? "无法读取 TNG 充值申请。");
    }

    if (giftsRes.ok) {
      setGifts(Array.isArray(giftsData) ? giftsData : []);
    }

    if (transactionsRes.ok) {
      setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
    }

    if (rechargeRes.ok) {
      setRechargeRequests(Array.isArray(rechargeData) ? rechargeData : []);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      void signIn("discord", { callbackUrl: "/admin" });
      return;
    }

    if (status === "authenticated") {
      queueMicrotask(() => {
        void loadPlaymates();
        void loadAdminRecords();
      });
    }
  }, [status]);

  const saveDiscordId = async (playmate: Playmate) => {
    const res = await fetch(`/api/playmates/${playmate.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: playmate.name,
        game: playmate.game,
        price: playmate.price,
        description: playmate.description,
        image: playmate.image ?? "",
        discordId: discordIds[playmate.id] ?? "",
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error ?? "无法保存 Discord ID。");
      return;
    }

    setMessage("陪玩 Discord ID 已保存。");
    await loadPlaymates();
  };

  const adjustCoins = async (playmate: Playmate) => {
    const amount = Number(coinAdjustments[playmate.id]);

    if (!Number.isInteger(amount) || amount === 0) {
      setMessage("请输入非 0 的整数金币数量。扣除请填负数。");
      return;
    }

    const res = await fetch(`/api/playmates/${playmate.id}/coins`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error ?? "无法调整陪玩金币。");
      return;
    }

    setMessage("陪玩金币已调整。");
    setCoinAdjustments((prev) => ({ ...prev, [playmate.id]: "" }));
    await loadPlaymates();
    await loadAdminRecords();
  };

  const reviewRecharge = async (requestId: number, action: "approve" | "reject") => {
    const res = await fetch(`/api/recharge-requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error ?? "无法处理 TNG 验证。");
      return;
    }

    setMessage(action === "approve" ? "充值已通过，金币已发放。" : "充值申请已拒绝。");
    await loadAdminRecords();
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-300">
            Admin
          </p>
          <h1 className="mt-2 text-4xl font-black">陪玩列表</h1>
          <p className="mt-3 text-sm text-zinc-400">
            只有绑定 Discord ID 的陪玩，登录后才可以在“陪玩订单”看到顾客点自己的订单。
          </p>
        </div>

        {!isAdmin && status === "authenticated" && (
          <div className="rounded-lg border border-red-500/40 bg-red-950/20 p-6 text-red-200">
            只有管理员可以管理陪玩列表。
          </div>
        )}

        {message && (
          <p className="mb-5 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-cyan-200">
            {message}
          </p>
        )}

        {isAdmin && (
          <section className="mb-8 rounded-lg border border-yellow-400/40 bg-zinc-950 p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-yellow-200">
                  TNG 验证
                </p>
                <h2 className="mt-1 text-2xl font-black">充值申请</h2>
              </div>
              <p className="text-sm text-zinc-400">1 金币 = 1 MYR，通过后自动发放金币。</p>
            </div>

            <div className="grid gap-3">
              {rechargeRequests.map((request) => (
                <article
                  key={request.id}
                  className="grid gap-4 rounded-lg border border-zinc-800 bg-black p-4 lg:grid-cols-[1fr_140px_140px_180px] lg:items-center"
                >
                  <div>
                    <h3 className="text-lg font-bold">{request.user.discordName}</h3>
                    <p className="mt-1 break-all text-xs text-zinc-500">
                      Discord ID: {request.user.discordId}
                    </p>
                    <p className="mt-2 text-sm text-zinc-300">
                      转账用户名：<span className="font-bold text-white">{request.transferName}</span>
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      提交时间：{new Date(request.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-xl font-black text-yellow-200">
                    {request.amount} MYR
                  </p>
                  <p
                    className={`rounded-lg px-3 py-2 text-center text-sm font-bold ${
                      request.status === "pending"
                        ? "bg-yellow-950/40 text-yellow-100"
                        : request.status === "approved"
                          ? "bg-emerald-950/40 text-emerald-100"
                          : "bg-red-950/40 text-red-100"
                    }`}
                  >
                    {request.status === "pending"
                      ? "待验证"
                      : request.status === "approved"
                        ? "已通过"
                        : "已拒绝"}
                  </p>
                  {request.status === "pending" ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void reviewRecharge(request.id, "approve")}
                        className="flex-1 rounded-lg bg-white px-4 py-3 text-sm font-black text-black transition hover:bg-emerald-200"
                      >
                        通过
                      </button>
                      <button
                        type="button"
                        onClick={() => void reviewRecharge(request.id, "reject")}
                        className="flex-1 rounded-lg border border-red-400/60 px-4 py-3 text-sm font-black text-red-100 transition hover:bg-red-950/60"
                      >
                        拒绝
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">
                      {request.reviewedAt ? new Date(request.reviewedAt).toLocaleString() : "已处理"}
                    </p>
                  )}
                </article>
              ))}

              {rechargeRequests.length === 0 && (
                <p className="rounded-lg border border-zinc-800 bg-black px-4 py-6 text-center text-sm text-zinc-500">
                  暂无 TNG 充值申请。
                </p>
              )}
            </div>
          </section>
        )}

        {isAdmin && (
          <div className="grid gap-4">
            {playmates.map((playmate) => (
              <article
                key={playmate.id}
                className="grid gap-4 rounded-lg border border-zinc-800 bg-zinc-950 p-5 lg:grid-cols-[1fr_280px_180px_auto_auto] lg:items-end"
              >
                <div>
                  <h2 className="text-2xl font-bold">{playmate.name}</h2>
                  <p className="mt-1 text-sm text-cyan-300">{playmate.game}</p>
                  <p className="mt-2 text-sm text-zinc-400">{playmate.description}</p>
                  <p className="mt-2 text-sm font-bold text-yellow-200">
                    陪玩金币：{playmate.coinBalance}
                  </p>
                </div>
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    Discord ID
                  </span>
                  <input
                    value={discordIds[playmate.id] ?? ""}
                    onChange={(event) =>
                      setDiscordIds((prev) => ({ ...prev, [playmate.id]: event.target.value }))
                    }
                    placeholder="填写陪玩的 Discord ID"
                    className="min-h-11 rounded-lg border border-zinc-700 bg-black px-4 text-white outline-none focus:border-cyan-300"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    金币调整
                  </span>
                  <input
                    value={coinAdjustments[playmate.id] ?? ""}
                    onChange={(event) =>
                      setCoinAdjustments((prev) => ({ ...prev, [playmate.id]: event.target.value }))
                    }
                    type="number"
                    placeholder="+10 / -5"
                    className="min-h-11 rounded-lg border border-zinc-700 bg-black px-4 text-white outline-none focus:border-cyan-300"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void saveDiscordId(playmate)}
                  className="rounded-lg bg-white px-5 py-3 text-sm font-black text-black transition hover:bg-cyan-200"
                >
                  保存
                </button>
                <button
                  type="button"
                  onClick={() => void adjustCoins(playmate)}
                  className="rounded-lg border border-yellow-400/60 px-5 py-3 text-sm font-black text-yellow-100 transition hover:bg-yellow-300 hover:text-black"
                >
                  调整金币
                </button>
              </article>
            ))}
          </div>
        )}

        {isAdmin && (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="text-2xl font-black">礼物记录</h2>
              <div className="mt-4 grid gap-2">
                {gifts.slice(0, 12).map((gift) => (
                  <div key={gift.id} className="rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm">
                    <p className="font-bold text-yellow-200">
                      {gift.user.discordName} 送 {gift.giftName} 给 {gift.playmate.name}
                    </p>
                    <p className="mt-1 text-zinc-500">
                      {gift.coinCost} 金币 · {new Date(gift.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
                {gifts.length === 0 && <p className="text-sm text-zinc-500">暂无礼物记录。</p>}
              </div>
            </section>

            <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="text-2xl font-black">陪玩业绩流水</h2>
              <div className="mt-4 grid gap-2">
                {transactions.slice(0, 12).map((transaction) => (
                  <div key={transaction.id} className="rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm">
                    <p className={transaction.amount >= 0 ? "font-bold text-emerald-200" : "font-bold text-red-200"}>
                      {transaction.playmate.name} · {transaction.amount >= 0 ? "+" : ""}
                      {transaction.amount} 金币 · {transaction.type}
                    </p>
                    <p className="mt-1 text-zinc-500">
                      {transaction.note ?? "无备注"} · {new Date(transaction.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
                {transactions.length === 0 && <p className="text-sm text-zinc-500">暂无业绩记录。</p>}
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
