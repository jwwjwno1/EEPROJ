"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/navbar";
import { signIn, useSession } from "next-auth/react";

type OrderStatus = "pending" | "accepted" | "completed";

type Appointment = {
  id: number;
  appointment: string;
  duration: number;
  status: OrderStatus;
  coinCost: number;
  lateFee: number;
  rating?: number | null;
  ratingComment?: string | null;
  playmate: {
    name: string;
    game: string;
  };
};

const statusLabel: Record<OrderStatus, string> = {
  pending: "等待接单",
  accepted: "接单中",
  completed: "完成订单",
};

const statusClass: Record<OrderStatus, string> = {
  pending: "border-yellow-400/40 text-yellow-200",
  accepted: "border-cyan-300/40 text-cyan-200",
  completed: "border-emerald-300/40 text-emerald-200",
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

export default function OrdersPage() {
  const { status } = useSession();
  const [orders, setOrders] = useState<Appointment[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [ratingByOrder, setRatingByOrder] = useState<Record<number, number>>({});
  const [commentByOrder, setCommentByOrder] = useState<Record<number, string>>({});

  const loadOrders = async () => {
    const res = await fetch("/api/appointments?scope=mine", { cache: "no-store" });
    const data = await readJson(res);

    if (!res.ok) {
      setMessage(data?.error ?? "无法读取你的订单，请稍后再试。");
      return;
    }

    setOrders(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      void signIn("discord", { callbackUrl: "/orders" });
      return;
    }

    if (status === "authenticated") {
      queueMicrotask(() => void loadOrders());
    }
  }, [status]);

  const rateOrder = async (orderId: number) => {
    const rating = ratingByOrder[orderId] ?? 10;
    const res = await fetch(`/api/appointments/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rate", rating, comment: commentByOrder[orderId] ?? "" }),
    });
    const data = await readJson(res);

    if (!res.ok) {
      setMessage(data?.error ?? "无法提交评分，请稍后再试。");
      return;
    }

    setMessage("评分已提交。");
    await loadOrders();
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-300">
            Your Orders
          </p>
          <h1 className="mt-2 text-4xl font-black">你的订单</h1>
        </div>

        {message && (
          <p className="mb-5 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-cyan-200">
            {message}
          </p>
        )}

        <div className="grid gap-4">
          {orders.map((order) => (
            <article key={order.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{order.playmate.name}</h2>
                  <p className="mt-1 text-sm text-cyan-300">{order.playmate.game}</p>
                  <p className="mt-3 text-sm text-zinc-400">
                    {new Date(order.appointment).toLocaleString()} / {order.duration} 分钟
                  </p>
                  <p className="mt-2 text-sm text-yellow-200">
                    已扣除 {order.coinCost} 金币
                    {order.lateFee > 0 && "（含 11:30pm 后额外 5 金币）"}
                  </p>
                </div>
                <span className={`rounded-lg border px-4 py-2 text-sm font-bold ${statusClass[order.status]}`}>
                  {statusLabel[order.status]}
                </span>
              </div>

              {order.status === "completed" && (
                <div className="mt-5 rounded-lg border border-zinc-800 bg-black p-4">
                  {order.rating ? (
                    <div className="grid gap-2 text-sm text-zinc-300">
                      <p>
                        你已给出 <span className="font-black text-yellow-200">{order.rating}/10</span> 分。
                      </p>
                      {order.ratingComment && (
                        <p className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-400">
                          {order.ratingComment}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-[160px_1fr_auto] sm:items-end">
                      <label className="grid gap-2 sm:w-40">
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                          评分 1-10
                        </span>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={ratingByOrder[order.id] ?? 10}
                          onChange={(event) =>
                            setRatingByOrder((prev) => ({
                              ...prev,
                              [order.id]: Number(event.target.value),
                            }))
                          }
                          className="min-h-11 rounded-lg border border-zinc-700 bg-zinc-950 px-4 text-white outline-none focus:border-cyan-300"
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                          评论（可不填）
                        </span>
                        <textarea
                          value={commentByOrder[order.id] ?? ""}
                          onChange={(event) =>
                            setCommentByOrder((prev) => ({
                              ...prev,
                              [order.id]: event.target.value,
                            }))
                          }
                          className="min-h-11 rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-cyan-300"
                          placeholder="写下你的体验"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => void rateOrder(order.id)}
                        className="rounded-lg bg-white px-5 py-3 text-sm font-black text-black transition hover:bg-cyan-200"
                      >
                        提交评分
                      </button>
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>

        {status === "authenticated" && orders.length === 0 && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-10 text-center text-zinc-400">
            你还没有预约订单。
          </div>
        )}
      </section>
    </main>
  );
}
