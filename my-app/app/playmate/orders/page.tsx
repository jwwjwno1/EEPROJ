"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Navbar from "@/components/navbar";
import { signIn, useSession } from "next-auth/react";

type OrderStatus = "pending" | "accepted" | "completed" | "rejected";

type Appointment = {
  id: number;
  appointment: string;
  duration: number;
  status: OrderStatus;
  acceptedAt?: string | null;
  coinCost: number;
  lateFee: number;
  rating?: number | null;
  ratingComment?: string | null;
  rejectReason?: string | null;
  proofImage?: string | null;
  user: {
    discordName: string;
    discordId: string;
    avatar?: string | null;
  };
  playmate: {
    name: string;
    discordId?: string | null;
  };
};

type PlaymateTransaction = {
  id: number;
  amount: number;
  type: string;
  note?: string | null;
  createdAt: string;
};

type PlaymateAccount = {
  id: number;
  name: string;
  coinBalance: number;
  transactions: PlaymateTransaction[];
};

const statusLabel: Record<OrderStatus, string> = {
  pending: "等待接单",
  accepted: "接单中",
  completed: "完成订单",
  rejected: "已拒绝",
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

export default function PlaymateOrdersPage() {
  const { status } = useSession();
  const [orders, setOrders] = useState<Appointment[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isAllowed, setIsAllowed] = useState(false);
  const [playmateAccount, setPlaymateAccount] = useState<PlaymateAccount | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [rejectReasons, setRejectReasons] = useState<Record<number, string>>({});

  const acceptedAmount = orders.reduce(
    (sum, o) => (o.status === "accepted" ? sum + Number(o.coinCost ?? 0) : sum),
    0,
  );
  const totalRevenue = orders.reduce(
    (sum, o) => (o.status === "completed" ? sum + Number(o.coinCost ?? 0) : sum),
    0,
  );
  const giftRevenue = playmateAccount
    ? playmateAccount.transactions.reduce((sum, t) => {
        const note = (t.note ?? "").toLowerCase();
        if (t.type === "gift" || note.includes("gift") || note.includes("礼物")) {
          return sum + Math.max(0, Number(t.amount ?? 0));
        }
        return sum;
      }, 0)
    : 0;
  const [proofFiles, setProofFiles] = useState<Record<number, File | null>>({});
  const [uploadingOrderId, setUploadingOrderId] = useState<number | null>(null);

  const loadOrders = async () => {
    const res = await fetch("/api/appointments?scope=playmate", { cache: "no-store" });
    const data = await readJson(res);

    if (!res.ok) {
      setIsAllowed(false);
      setMessage(data?.error ?? "无法读取陪玩订单，请稍后再试。");
      return;
    }

    setIsAllowed(true);
    setOrders(Array.isArray(data) ? data : []);
  };

  const loadPlaymateAccount = async () => {
    const res = await fetch("/api/playmates/me", { cache: "no-store" });
    const data = await readJson(res);

    if (res.ok && data?.playmate) {
      setPlaymateAccount(data.playmate);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      void signIn("discord", { callbackUrl: "/playmate/orders" });
      return;
    }

    if (status === "authenticated") {
      queueMicrotask(() => {
        void loadOrders();
        void loadPlaymateAccount();
      });
    }
  }, [status]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(timer);
  }, []);

  const updateOrder = async (
    orderId: number,
    action: "accept" | "reject" | "complete",
    payload: Record<string, string> = {},
  ) => {
    const res = await fetch(`/api/appointments/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    const data = await readJson(res);

    if (!res.ok) {
      setMessage(data?.error ?? "无法更新订单，请稍后再试。");
      return;
    }

    const successMessage =
      action === "accept"
        ? "已接受订单。"
        : action === "reject"
          ? "已拒绝订单，金币已退回给老板。"
          : "订单已完成，等待顾客评分。";

    setMessage(successMessage);
    window.dispatchEvent(new Event("ee-orders-updated"));
    setRejectReasons((prev) => ({ ...prev, [orderId]: "" }));
    setProofFiles((prev) => ({ ...prev, [orderId]: null }));
    await loadOrders();
    await loadPlaymateAccount();
  };

  const rejectOrder = async (orderId: number) => {
    const reason = (rejectReasons[orderId] ?? "").trim();

    if (!reason) {
      setMessage("请先填写拒绝原因。");
      return;
    }

    await updateOrder(orderId, "reject", { reason });
  };

  const completeOrder = async (orderId: number) => {
    const file = proofFiles[orderId];

    if (!file) {
      setMessage("请先上传战绩证明照片。");
      return;
    }

    setUploadingOrderId(orderId);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const uploadRes = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });
      const uploadData = await readJson(uploadRes);

      if (!uploadRes.ok || !uploadData?.url) {
        setMessage(uploadData?.error ?? "战绩证明上传失败，请稍后再试。");
        return;
      }

      await updateOrder(orderId, "complete", { proofImage: uploadData.url });
    } finally {
      setUploadingOrderId(null);
    }
  };

  const getEndTime = (order: Appointment) => {
    const timerStart = order.acceptedAt ?? order.appointment;

    return new Date(timerStart).getTime() + order.duration * 60 * 1000;
  };

  const getTimerText = (order: Appointment) => {
    const remaining = getEndTime(order) - now;

    if (remaining <= 0) {
      return "服务时间已结束，可以完成订单";
    }

    const totalSeconds = Math.ceil(remaining / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-300">
            Playmate Orders
          </p>
          <h1 className="mt-2 text-4xl font-black">陪玩订单</h1>
          <p className="mt-3 text-sm text-zinc-400">
            只有 admin 在陪玩资料里绑定了你的 Discord ID，这里才会显示顾客点你的订单。
          </p>
        </div>

        {message && (
          <p className="mb-5 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-cyan-200">
            {message}
          </p>
        )}

        {playmateAccount && (
          <section className="mb-6 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-300">
                  业绩
                </p>
                <h2 className="mt-1 text-2xl font-black">{playmateAccount.name}</h2>
              </div>
              <p className="text-2xl font-black text-yellow-200">
                {playmateAccount.coinBalance} 金币
              </p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-300">
                <div className="text-xs text-zinc-400">接单金额</div>
                <div className="mt-1 text-xl font-black text-cyan-200">{acceptedAmount} 金币</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-300">
                <div className="text-xs text-zinc-400">总收入</div>
                <div className="mt-1 text-xl font-black text-yellow-200">{totalRevenue} 金币</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-300">
                <div className="text-xs text-zinc-400">礼物收入</div>
                <div className="mt-1 text-xl font-black text-emerald-200">{giftRevenue} 金币</div>
              </div>
            </div>
            <div className="mt-6 grid gap-2">
              {playmateAccount.transactions.slice(0, 6).map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex flex-col gap-1 rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className={transaction.amount >= 0 ? "text-emerald-200" : "text-red-200"}>
                    {transaction.amount >= 0 ? "+" : ""}
                    {transaction.amount} 金币 · {transaction.type}
                  </span>
                  <span className="text-zinc-500">
                    {transaction.note ?? "无备注"} · {new Date(transaction.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
              {playmateAccount.transactions.length === 0 && (
                <p className="rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-500">
                  暂无业绩记录。
                </p>
              )}
            </div>
          </section>
        )}

        <div className="grid gap-4">
          {orders.map((order) => (
            <article key={order.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-4 rounded-lg border border-zinc-800 bg-black p-4">
                    {order.user.avatar ? (
                      <Image
                        src={order.user.avatar}
                        alt={order.user.discordName}
                        width={64}
                        height={64}
                        className="h-16 w-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800 text-xl font-black text-zinc-300">
                        {order.user.discordName.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
                        老板资料
                      </p>
                      <h2 className="truncate text-2xl font-bold">{order.user.discordName}</h2>
                      <p className="mt-1 break-all text-sm text-zinc-500">
                        Discord ID: {order.user.discordId}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-zinc-400">
                    {new Date(order.appointment).toLocaleString()} / {order.duration} 分钟
                  </p>
                  {order.acceptedAt && (
                    <p className="mt-2 text-sm text-zinc-500">
                      接单时间：{new Date(order.acceptedAt).toLocaleString()}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-yellow-200">
                    收入：{order.coinCost} 金币
                    {order.lateFee > 0 && "（含 11:30pm 后额外 5 金币）"}
                  </p>
                  <p className="mt-2 text-sm text-cyan-300">状态：{statusLabel[order.status]}</p>
                  {order.status === "accepted" && (
                    <p className="mt-2 rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-300">
                      计时器：{getTimerText(order)}
                    </p>
                  )}
                  {order.rejectReason && (
                    <p className="mt-2 rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-100">
                      拒绝原因：{order.rejectReason}
                    </p>
                  )}
                  {order.proofImage && (
                    <a
                      href={order.proofImage}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 block overflow-hidden rounded-lg border border-zinc-800 bg-black"
                    >
                      <Image
                        src={order.proofImage}
                        alt={`订单 #${order.id} 战绩证明`}
                        width={720}
                        height={360}
                        className="h-56 w-full object-cover"
                      />
                    </a>
                  )}
                  {order.rating && (
                    <p className="mt-2 text-sm text-yellow-200">顾客评分：{order.rating}/10</p>
                  )}
                  {order.ratingComment && (
                    <p className="mt-2 rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-300">
                      {order.ratingComment}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-3 lg:w-64">
                  {order.status === "pending" && (
                    <>
                      <p className="rounded-lg border border-cyan-400/40 bg-cyan-950/20 px-3 py-2 text-xs font-semibold text-cyan-100">
                        待处理：可以接受或填写原因后拒绝。
                      </p>
                      <button
                        type="button"
                        onClick={() => void updateOrder(order.id, "accept")}
                        className="rounded-lg bg-white px-5 py-3 text-sm font-black text-black transition hover:bg-cyan-200"
                      >
                        接受订单
                      </button>
                      <textarea
                        value={rejectReasons[order.id] ?? ""}
                        onChange={(event) =>
                          setRejectReasons((prev) => ({
                            ...prev,
                            [order.id]: event.target.value,
                          }))
                        }
                        placeholder="填写拒绝原因"
                        rows={3}
                        className="min-h-24 rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none transition focus:border-red-300"
                      />
                      <button
                        type="button"
                        onClick={() => void rejectOrder(order.id)}
                        className="rounded-lg border border-red-400/60 px-5 py-3 text-sm font-black text-red-100 transition hover:bg-red-950/60"
                      >
                        拒绝订单
                      </button>
                    </>
                  )}
                  {order.status === "accepted" && (
                    <>
                      <label className="rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-300">
                        <span className="block font-bold text-white">战绩证明照片</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          onChange={(event) =>
                            setProofFiles((prev) => ({
                              ...prev,
                              [order.id]: event.target.files?.[0] ?? null,
                            }))
                          }
                          className="mt-3 block w-full text-xs text-zinc-400 file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-bold file:text-black"
                        />
                        {proofFiles[order.id]?.name && (
                          <span className="mt-2 block truncate text-xs text-cyan-200">
                            {proofFiles[order.id]?.name}
                          </span>
                        )}
                      </label>
                      <button
                        type="button"
                        onClick={() => void completeOrder(order.id)}
                        disabled={uploadingOrderId === order.id}
                        className="rounded-lg bg-white px-5 py-3 text-sm font-black text-black transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {uploadingOrderId === order.id ? "上传中..." : "完成订单"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        {status === "authenticated" && isAllowed && orders.length === 0 && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-10 text-center text-zinc-400">
            目前没有陪玩订单。请确认 admin 已把你的 Discord ID 绑定到陪玩资料。
          </div>
        )}
      </section>
    </main>
  );
}
