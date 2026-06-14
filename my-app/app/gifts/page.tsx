"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import Navbar from "@/components/navbar";

type Playmate = {
  id: number;
  name: string;
  game: string;
  price: number;
  description: string;
  image?: string | null;
};

const giftOptions = [
  { name: "小心心", coinCost: 5 },
  { name: "奶茶", coinCost: 10 },
  { name: "花束", coinCost: 20 },
  { name: "皇冠", coinCost: 50 },
];

const isValidImageSrc = (src?: string | null) =>
  Boolean(src && (src.startsWith("/") || src.startsWith("http://") || src.startsWith("https://")));

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

export default function GiftsPage() {
  const { status } = useSession();
  const [playmates, setPlaymates] = useState<Playmate[]>([]);
  const [coinBalance, setCoinBalance] = useState(0);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [sendingKey, setSendingKey] = useState<string | null>(null);

  const loadWallet = useCallback(async () => {
    if (status !== "authenticated") {
      setCoinBalance(0);
      return;
    }

    const res = await fetch("/api/wallet", { cache: "no-store" });
    const data = await readJson(res);

    if (res.ok) {
      setCoinBalance(Number(data?.coinBalance ?? 0));
    }
  }, [status]);

  const loadPlaymates = async () => {
    const res = await fetch("/api/playmates", { cache: "no-store" });
    const data = await readJson(res);

    if (!res.ok) {
      setMessage(data?.error ?? "无法读取陪玩列表。");
      return;
    }

    setPlaymates(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    queueMicrotask(() => {
      void loadPlaymates();
      void loadWallet();
    });
  }, [loadWallet]);

  const filteredPlaymates = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return playmates;
    }

    return playmates.filter((playmate) =>
      `${playmate.name} ${playmate.game} ${playmate.description}`.toLowerCase().includes(keyword),
    );
  }, [playmates, search]);

  const sendGift = async (playmate: Playmate, giftName: string) => {
    if (status !== "authenticated") {
      void signIn("discord", { callbackUrl: "/gifts" });
      return;
    }

    setSendingKey(`${playmate.id}-${giftName}`);
    setMessage(null);

    try {
      const res = await fetch("/api/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playmateId: playmate.id, giftName }),
      });
      const data = await readJson(res);

      if (!res.ok) {
        setMessage(data?.error ?? "无法送出礼物。");
        return;
      }

      setCoinBalance(Number(data?.coinBalance ?? 0));
      window.dispatchEvent(new Event("ee-coins-updated"));
      setMessage(`已送出 ${giftName} 给 ${playmate.name}。`);
    } catch {
      setMessage("无法送出礼物，请稍后再试。");
    } finally {
      setSendingKey(null);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-300">
              Gifts
            </p>
            <h1 className="mt-2 text-4xl font-black">礼物中心</h1>
            <p className="mt-3 text-sm text-zinc-400">
              选择陪玩和礼物，送出后会扣除你的金币，并记录给 admin 查看。
            </p>
          </div>
          <p className="rounded-lg border border-yellow-400/40 bg-zinc-950 px-4 py-3 text-sm">
            当前余额：<span className="font-black text-yellow-200">{coinBalance} 金币</span>
          </p>
        </div>

        <div className="mb-6 flex max-w-xl rounded-lg border border-zinc-800 bg-zinc-950 p-2">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索陪玩、游戏或简介"
            className="min-h-10 flex-1 bg-transparent px-3 text-sm text-white outline-none placeholder:text-zinc-500"
          />
        </div>

        {message && (
          <p className="mb-5 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-cyan-200">
            {message}
          </p>
        )}

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredPlaymates.map((playmate) => (
            <article key={playmate.id} className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
              <div className="relative h-48 bg-zinc-900">
                {isValidImageSrc(playmate.image) ? (
                  <Image
                    src={playmate.image as string}
                    alt={playmate.name}
                    fill
                    sizes="(min-width: 1280px) 420px, (min-width: 768px) 50vw, 100vw"
                    quality={100}
                    unoptimized={playmate.image?.startsWith("http")}
                    className="object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-zinc-500">暂无图片</div>
                )}
              </div>

              <div className="p-5">
                <h2 className="text-2xl font-bold">{playmate.name}</h2>
                <p className="mt-1 text-sm text-cyan-300">{playmate.game}</p>
                <p className="mt-3 min-h-12 text-sm leading-6 text-zinc-400">{playmate.description}</p>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  {giftOptions.map((gift) => (
                    <button
                      key={gift.name}
                      type="button"
                      disabled={sendingKey === `${playmate.id}-${gift.name}`}
                      onClick={() => void sendGift(playmate, gift.name)}
                      className="rounded-lg border border-zinc-700 bg-black px-4 py-4 text-sm font-black text-yellow-100 transition hover:border-yellow-300 hover:text-yellow-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {gift.name}
                      <span className="mt-1 block text-xs text-zinc-500">{gift.coinCost} 金币</span>
                    </button>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>

        {filteredPlaymates.length === 0 && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-10 text-center text-zinc-400">
            暂时没有可送礼的陪玩。
          </div>
        )}
      </section>
    </main>
  );
}
