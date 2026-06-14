"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

const coinPackages = [20, 50, 100, 200, 500];

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const isLoggedIn = status === "authenticated";
  const [coinBalance, setCoinBalance] = useState(0);
  const [isRechargeOpen, setIsRechargeOpen] = useState(false);
  const [isPlaymate, setIsPlaymate] = useState(false);
  const [orderCounts, setOrderCounts] = useState({ mine: 0, playmate: 0 });
  const [selectedRecharge, setSelectedRecharge] = useState<number | null>(null);
  const [transferName, setTransferName] = useState("");
  const [rechargeMessage, setRechargeMessage] = useState<string | null>(null);
  const [isSubmittingRecharge, setIsSubmittingRecharge] = useState(false);

  const loadWallet = useCallback(async () => {
    if (!isLoggedIn) {
      setCoinBalance(0);
      return;
    }

    try {
      const res = await fetch("/api/wallet", { cache: "no-store" });
      const data = await res.json();

      if (res.ok) {
        setCoinBalance(Number(data.coinBalance ?? 0));
      }
    } catch {
      setCoinBalance(0);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const syncCoins = () => void loadWallet();

    syncCoins();
    window.addEventListener("ee-coins-updated", syncCoins);

    return () => {
      window.removeEventListener("ee-coins-updated", syncCoins);
    };
  }, [loadWallet]);

  const loadOrderCounts = useCallback(async () => {
    if (!isLoggedIn) {
      setOrderCounts({ mine: 0, playmate: 0 });
      return;
    }

    try {
      const res = await fetch("/api/appointment-counts", { cache: "no-store" });
      const data = await res.json();

      if (res.ok) {
        setOrderCounts({
          mine: Number(data.mine ?? 0),
          playmate: Number(data.playmate ?? 0),
        });
      }
    } catch {
      setOrderCounts({ mine: 0, playmate: 0 });
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const syncOrders = () => void loadOrderCounts();

    syncOrders();
    window.addEventListener("ee-orders-updated", syncOrders);

    return () => {
      window.removeEventListener("ee-orders-updated", syncOrders);
    };
  }, [loadOrderCounts]);

  useEffect(() => {
    let isMounted = true;

    if (!isLoggedIn) {
      queueMicrotask(() => {
        if (isMounted) {
          setIsPlaymate(false);
        }
      });
      return;
    }

    const loadPlaymateStatus = async () => {
      try {
        const res = await fetch("/api/playmates/me", { cache: "no-store" });
        const data = await res.json();

        if (isMounted) {
          setIsPlaymate(Boolean(data.isPlaymate));
        }
      } catch {
        if (isMounted) {
          setIsPlaymate(false);
        }
      }
    };

    void loadPlaymateStatus();

    return () => {
      isMounted = false;
    };
  }, [isLoggedIn]);

  const openRecharge = () => {
    if (!isLoggedIn) {
      void signIn("discord", { callbackUrl: "/playmate" });
      return;
    }

    setSelectedRecharge(null);
    setTransferName("");
    setRechargeMessage(null);
    setIsRechargeOpen(true);
  };

  const submitRecharge = async () => {
    if (!selectedRecharge) {
      setRechargeMessage("请先选择充值金币数量。");
      return;
    }

    if (!transferName.trim()) {
      setRechargeMessage("请填写你的 TNG 转账用户名。");
      return;
    }

    setIsSubmittingRecharge(true);
    setRechargeMessage(null);

    const res = await fetch("/api/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: selectedRecharge, transferName }),
    });
    const data = await res.json();

    if (res.ok) {
      setRechargeMessage(data.message ?? "充值申请已提交，等待 admin 验证。");
      setSelectedRecharge(null);
      setTransferName("");
    } else {
      setRechargeMessage(data.error ?? "无法提交充值申请，请稍后再试。");
    }

    setIsSubmittingRecharge(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-black text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Image
            src="/image/logo.png"
            alt="EE Studio"
            width={40}
            height={40}
            priority
            className="h-10 w-10 rounded-lg object-contain"
          />
          <h1 className="text-xl font-bold">EE Studio</h1>
        </div>

        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link href="/">首页</Link>
          <Link href="/playmate">陪玩大厅</Link>
          <Link href="/leaderboard">排行榜</Link>
          <Link href="/gifts">礼物中心</Link>
          <Link href="/appointment">预约订单</Link>
          {isLoggedIn && (
            <Link href="/orders" className="relative inline-flex items-center gap-1.5">
              你的订单
              {pathname !== "/orders" && orderCounts.mine > 0 && (
                <span className="grid min-h-5 min-w-5 place-items-center rounded-full bg-yellow-300 px-1.5 text-xs font-black leading-none text-black">
                  {orderCounts.mine}
                </span>
              )}
            </Link>
          )}
          {isPlaymate && (
            <Link href="/playmate/orders" className="relative inline-flex items-center gap-1.5">
              陪玩订单
              {pathname !== "/playmate/orders" && orderCounts.playmate > 0 && (
                <span className="grid min-h-5 min-w-5 place-items-center rounded-full bg-yellow-300 px-1.5 text-xs font-black leading-none text-black">
                  {orderCounts.playmate}
                </span>
              )}
            </Link>
          )}
          {isPlaymate && <Link href="/playmate/coins">陪玩流水</Link>}
          <Link href="/contact">联系我们</Link>
          {isLoggedIn && <Link href="/profile">个人资料</Link>}
          {session?.user?.role === "admin" && <Link href="/admin">Admin</Link>}
          {session?.user?.role === "admin" && <Link href="/admin/coins">金币流水</Link>}
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openRecharge}
            className="rounded-lg border border-yellow-400/50 bg-zinc-950 px-4 py-2 text-sm font-bold text-yellow-200 transition hover:border-yellow-300 hover:bg-yellow-300 hover:text-black"
          >
            金币 {isLoggedIn ? coinBalance : 0}
          </button>

          {isLoggedIn ? (
            <>
              <Link href="/profile" className="hidden text-sm text-zinc-300 sm:block">
                {session.user?.name ?? "个人资料"}
              </Link>
              <button
                type="button"
                onClick={() => void signOut({ callbackUrl: "/" })}
                className="rounded-lg bg-white px-5 py-2 font-semibold text-black"
              >
                登出
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => void signIn("discord", { callbackUrl: "/profile" })}
              className="rounded-lg bg-white px-5 py-2 font-semibold text-black"
            >
              Discord 登录
            </button>
          )}
        </div>
      </div>

      {isRechargeOpen && (
        <div
          className="fixed inset-0 z-[120] grid place-items-center bg-black/80 px-4 backdrop-blur-md"
          onClick={() => setIsRechargeOpen(false)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-yellow-400/40 bg-zinc-950 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.8)]"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-yellow-200">
                  充值金币
                </p>
                <h2 className="mt-1 text-2xl font-bold">当前 {coinBalance} 金币</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsRechargeOpen(false)}
                className="rounded-lg border border-zinc-700 bg-black px-4 py-2 text-sm font-semibold transition hover:border-yellow-300"
              >
                关闭
              </button>
            </div>

            <div className="mb-5 overflow-hidden rounded-lg border border-zinc-800 bg-black p-4">
              <Image
                src="/image/tngqrcode.jpg"
                alt="TNG QR Code"
                width={420}
                height={420}
                className="mx-auto h-auto w-full max-w-72 rounded-lg"
              />
              <p className="mt-3 text-center text-sm text-zinc-400">
                1 金币 = 1 MYR，转账后填写你的 TNG 用户名。
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {coinPackages.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setSelectedRecharge(amount)}
                  className={`rounded-lg border px-4 py-4 text-lg font-black transition ${
                    selectedRecharge === amount
                      ? "border-yellow-300 bg-yellow-300 text-black"
                      : "border-zinc-700 bg-black text-white hover:border-yellow-300 hover:text-yellow-200"
                  }`}
                >
                  {amount} 币
                </button>
              ))}
            </div>

            {selectedRecharge && (
              <div className="mt-5 rounded-lg border border-yellow-400/40 bg-yellow-950/20 px-4 py-3 text-sm text-yellow-100">
                需转账：<span className="font-black">{selectedRecharge} MYR</span>
              </div>
            )}

            <label className="mt-5 grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                TNG 转账用户名
              </span>
              <input
                value={transferName}
                onChange={(event) => setTransferName(event.target.value)}
                placeholder="填写你转账时显示的名字"
                className="min-h-11 rounded-lg border border-zinc-700 bg-black px-4 text-white outline-none focus:border-yellow-300"
              />
            </label>

            {rechargeMessage && (
              <p className="mt-4 rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm text-cyan-200">
                {rechargeMessage}
              </p>
            )}

            <button
              type="button"
              onClick={() => void submitRecharge()}
              disabled={isSubmittingRecharge}
              className="mt-5 w-full rounded-lg bg-white px-5 py-3 text-sm font-black text-black transition hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmittingRecharge ? "提交中..." : "提交充值验证"}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
