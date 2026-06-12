"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/navbar";
import { signIn, useSession } from "next-auth/react";

type GenderPreference = "随机" | "男生" | "女生";
type PlaymateRole = "技术陪玩" | "娱乐陪玩";

type Playmate = {
  id: number;
  name: string;
  game: string;
  price: number;
  role: PlaymateRole;
  description: string;
  image?: string | null;
};

const serviceCategories = ["陪玩", "代肝", "教学单", "陪聊", "哄睡", "唱歌", "语音聊天", "陪看电影"];
const gameOptions = ["Valorant", "CS2", "League of Legends", "Apex Legends", ...serviceCategories, "其他游戏"];
const genderOptions: GenderPreference[] = ["随机", "男生", "女生"];

const fieldClass =
  "min-h-12 rounded-lg border border-zinc-700 bg-black px-4 text-white outline-none transition placeholder:text-zinc-500 focus:border-cyan-300";

const isValidImageSrc = (src?: string | null) =>
  Boolean(src && (src.startsWith("/") || src.startsWith("http://") || src.startsWith("https://")));

const getOrderCoins = (playmate: Playmate, minutes: number) =>
  playmate.role === "技术陪玩"
    ? Math.max(1, Math.ceil(playmate.price * Math.max(1, Math.ceil(minutes / 30))))
    : Math.max(1, Math.ceil(playmate.price * (minutes / 60)));

const getPlaymateUnitLabel = (playmate: Pick<Playmate, "role">) =>
  playmate.role === "技术陪玩" ? "局" : "小时";

const getLateFee = (appointment: string) => {
  if (!appointment) {
    return 0;
  }

  const date = new Date(appointment);
  const hour = date.getHours();
  const minute = date.getMinutes();

  return hour > 23 || (hour === 23 && minute >= 30) ? 5 : 0;
};

const loadPlaymates = async () => {
  const res = await fetch("/api/playmates", { cache: "no-store" });
  const data = await res.json();

  if (!res.ok) {
    return [];
  }

  return data as Playmate[];
};

export default function AppointmentPage() {
  const { data: session, status } = useSession();
  const [playmates, setPlaymates] = useState<Playmate[]>([]);
  const [playmateId, setPlaymateId] = useState("random");
  const [gender, setGender] = useState<GenderPreference>("随机");
  const [game, setGame] = useState("Valorant");
  const [appointment, setAppointment] = useState("");
  const [minutes, setMinutes] = useState(30);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Playmate[]>([]);
  const [selectedPlaymate, setSelectedPlaymate] = useState<Playmate | null>(null);
  const [coinBalance, setCoinBalance] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void loadPlaymates().then(setPlaymates);
  }, []);

  useEffect(() => {
    const syncCoins = async () => {
      if (status !== "authenticated") {
        setCoinBalance(0);
        return;
      }

      const res = await fetch("/api/wallet", { cache: "no-store" });
      const data = await res.json();

      if (res.ok) {
        setCoinBalance(Number(data.coinBalance ?? 0));
      }
    };

    void syncCoins();
    window.addEventListener("ee-coins-updated", syncCoins);

    return () => {
      window.removeEventListener("ee-coins-updated", syncCoins);
    };
  }, [status]);

  const selectedCost = useMemo(
    () => (selectedPlaymate ? getOrderCoins(selectedPlaymate, minutes) + getLateFee(appointment) : 0),
    [appointment, minutes, selectedPlaymate],
  );

  const findCandidates = () => {
    if (status !== "authenticated") {
      void signIn("discord", { callbackUrl: "/appointment" });
      return;
    }

    if (!game || !appointment || minutes < 30) {
      setMessage("请填写游戏、时间和至少 30 分钟的服务时长。");
      return;
    }

    const appointmentDate = new Date(appointment);
    if (Number.isNaN(appointmentDate.getTime()) || appointmentDate <= new Date()) {
      setMessage("预约时间必须是未来时间。");
      return;
    }

    const matches = playmates.filter((playmate) => {
      const matchesPlaymate = playmateId === "random" || playmate.id === Number(playmateId);
      const matchesGame =
        game === "其他游戏" || playmate.game.toLowerCase().includes(game.toLowerCase());
      const profileText = `${playmate.name} ${playmate.description}`.toLowerCase();
      const matchesGender =
        gender === "随机" || profileText.includes(gender === "女生" ? "女" : "男");

      return matchesPlaymate && matchesGame && matchesGender;
    });

    if (matches.length === 0) {
      setCandidates([]);
      setSelectedPlaymate(null);
      setMessage("暂时没有符合资格的陪玩，请调整选择。");
      return;
    }

    setCandidates(matches);
    setSelectedPlaymate(null);
    setMessage("已找到符合资格的陪玩，请选择一位后确认下单。");
  };

  const confirmOrder = async () => {
    if (!selectedPlaymate) {
      setMessage("请先选择陪玩。");
      return;
    }

    if (coinBalance < selectedCost) {
      setMessage(`金币不足，本单需要 ${selectedCost} 金币，当前只有 ${coinBalance} 金币。请先到右上角充值。`);
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playmateId: selectedPlaymate.id,
          appointment,
          duration: minutes,
          note,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error ?? "无法建立预约。");
        return;
      }

      setCoinBalance(coinBalance - Number(data.coinCost ?? selectedCost));
      window.dispatchEvent(new Event("ee-coins-updated"));
      window.dispatchEvent(new Event("ee-orders-updated"));
      setMessage(`下单成功，已扣除 ${data.coinCost ?? selectedCost} 金币。`);
      setPlaymateId("random");
      setGender("随机");
      setAppointment("");
      setMinutes(30);
      setNote("");
      setCandidates([]);
      setSelectedPlaymate(null);
    } catch {
      setMessage("无法建立预约，请再试一次。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-300">
              预约订单
            </p>
            <h1 className="mt-2 text-4xl font-bold">老板下单</h1>
          </div>
          <p className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
            当前余额：<span className="font-black text-yellow-200">{coinBalance} 金币</span>
          </p>
        </div>

        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                当前老板
              </span>
              <input
                value={status === "authenticated" ? session?.user?.name ?? "Discord 老板" : "未登录"}
                readOnly
                className={fieldClass + " text-zinc-300"}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                选择陪玩
              </span>
              <select
                value={playmateId}
                onChange={(event) => setPlaymateId(event.target.value)}
                className={fieldClass}
              >
                <option value="random">随机</option>
                {playmates.map((playmate) => (
                  <option key={playmate.id} value={String(playmate.id)}>
                    {playmate.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                性别
              </span>
              <select
                value={gender}
                onChange={(event) => setGender(event.target.value as GenderPreference)}
                className={fieldClass}
              >
                {genderOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                游戏
              </span>
              <select value={game} onChange={(event) => setGame(event.target.value)} className={fieldClass}>
                {gameOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                时间
              </span>
              <input
                type="datetime-local"
                value={appointment}
                onChange={(event) => setAppointment(event.target.value)}
                className={fieldClass}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                分钟
              </span>
              <input
                value={minutes}
                onChange={(event) => setMinutes(Number(event.target.value))}
                type="number"
                min="30"
                step="30"
                className={fieldClass}
              />
            </label>

            <label className="grid gap-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                备注
              </span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="例如：想轻松聊天、要会指挥、不要压力局"
                className="min-h-28 rounded-lg border border-zinc-700 bg-black px-5 py-4 text-white outline-none transition placeholder:text-zinc-500 focus:border-cyan-300"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={findCandidates}
            className="mt-5 w-full rounded-lg bg-white px-5 py-4 text-sm font-black text-black transition hover:bg-cyan-200 active:scale-95"
          >
            选择下单
          </button>

          {message && (
            <p className="mt-4 rounded-lg border border-zinc-700 bg-black px-4 py-3 text-sm text-cyan-200">
              {message}
            </p>
          )}
        </section>

        {candidates.length > 0 && (
          <section className="mt-8 grid gap-4 md:grid-cols-3">
            {candidates.map((playmate) => {
              const cost = getOrderCoins(playmate, minutes);
              const isSelected = selectedPlaymate?.id === playmate.id;

              return (
                <article
                  key={playmate.id}
                  className={`rounded-lg border bg-zinc-950 p-4 transition ${
                    isSelected ? "border-cyan-300" : "border-zinc-800"
                  }`}
                >
                  <div className="relative mb-4 h-44 overflow-hidden rounded-lg bg-zinc-900">
                    {isValidImageSrc(playmate.image) ? (
                      <Image
                        src={playmate.image as string}
                        alt={playmate.name}
                        fill
                        sizes="(min-width: 768px) 33vw, 100vw"
                        unoptimized={playmate.image?.startsWith("http")}
                        className="object-cover"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-sm text-zinc-500">暂无图片</div>
                    )}
                  </div>
                  <h2 className="text-xl font-bold">{playmate.name}</h2>
                  <p className="mt-1 text-sm text-cyan-300">{playmate.game}</p>
                  <p className="mt-2 inline-flex rounded-lg border border-cyan-300/30 px-3 py-1 text-xs font-bold text-cyan-200">
                    {playmate.role} · {playmate.price} 金币 / {getPlaymateUnitLabel(playmate)}
                  </p>
                  <p className="mt-3 text-sm text-zinc-300">{playmate.description}</p>
                  <p className="mt-4 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-bold">
                    本单需要 {cost + getLateFee(appointment)} 金币
                    {getLateFee(appointment) > 0 && "（含 11:30pm 后额外 5 金币）"}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedPlaymate(playmate)}
                    className="mt-4 w-full rounded-lg bg-white px-4 py-3 text-sm font-bold text-black transition hover:bg-cyan-200"
                  >
                    选择这位陪玩
                  </button>
                </article>
              );
            })}
          </section>
        )}

        {selectedPlaymate && (
          <section className="mt-6 rounded-lg border border-cyan-300/40 bg-zinc-950 p-5">
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <h2 className="text-xl font-bold">确认下单</h2>
                <p className="mt-2 text-sm text-zinc-300">
                  {selectedPlaymate.name} · 需要 {selectedCost} 金币 · 当前 {coinBalance} 金币
                </p>
              </div>
              <button
                type="button"
                onClick={confirmOrder}
                disabled={isSubmitting}
                className="rounded-lg bg-white px-5 py-4 text-sm font-black text-black transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "下单中..." : `确认并扣除 ${selectedCost} 金币`}
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
