"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import Navbar from "@/components/navbar";

type PlaymateTransaction = {
  id: number;
  amount: number;
  type: string;
  note?: string | null;
  appointmentId?: number | null;
  giftId?: number | null;
  createdAt: string;
};

type PlaymateAccount = {
  id: number;
  name: string;
  coinBalance: number;
  transactions: PlaymateTransaction[];
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

export default function PlaymateCoinsPage() {
  const { status } = useSession();
  const [account, setAccount] = useState<PlaymateAccount | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadAccount = async () => {
    const res = await fetch("/api/playmates/me", { cache: "no-store" });
    const data = await readJson(res);

    if (!res.ok || !data?.isPlaymate) {
      setAccount(null);
      setMessage(data?.error ?? "只有已绑定 Discord ID 的陪玩可以查看金币流水。");
      return;
    }

    setAccount(data.playmate);
    setMessage(null);
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      void signIn("discord", { callbackUrl: "/playmate/coins" });
      return;
    }

    if (status === "authenticated") {
      queueMicrotask(() => void loadAccount());
    }
  }, [status]);

  const totals = useMemo(() => {
    const transactions = account?.transactions ?? [];

    return {
      order: transactions
        .filter((transaction) => transaction.type === "order")
        .reduce((total, transaction) => total + transaction.amount, 0),
      gift: transactions
        .filter((transaction) => transaction.type === "gift")
        .reduce((total, transaction) => total + transaction.amount, 0),
      admin: transactions
        .filter((transaction) => transaction.type === "admin")
        .reduce((total, transaction) => total + transaction.amount, 0),
    };
  }, [account]);

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-300">
            Playmate Coins
          </p>
          <h1 className="mt-2 text-4xl font-black">我的金币流水</h1>
          <p className="mt-3 text-sm text-zinc-400">
            这里会显示订单、礼物和 admin 调整，让你清楚自己赚了多少金币。
          </p>
        </div>

        {message && (
          <p className="mb-5 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-cyan-200">
            {message}
          </p>
        )}

        {account && (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-yellow-400/40 bg-zinc-950 p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">当前金币</p>
                <p className="mt-2 text-3xl font-black text-yellow-200">{account.coinBalance}</p>
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

            <div className="grid gap-3">
              {account.transactions.map((transaction) => (
                <article key={transaction.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className={transaction.amount >= 0 ? "font-black text-emerald-200" : "font-black text-red-200"}>
                        {transaction.amount >= 0 ? "+" : ""}
                        {transaction.amount} 金币 · {typeLabel[transaction.type] ?? transaction.type}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">{transaction.note ?? "无备注"}</p>
                    </div>
                    <p className="text-sm text-zinc-500">{new Date(transaction.createdAt).toLocaleString()}</p>
                  </div>
                </article>
              ))}
            </div>

            {account.transactions.length === 0 && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-10 text-center text-zinc-400">
                暂无金币流水。
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
