"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import Navbar from "@/components/navbar";
import { signIn, useSession } from "next-auth/react";

export default function AppointmentPage() {
  const { status } = useSession();

  useEffect(() => {
    const redirectTimer = setTimeout(() => {
      window.location.href = "/playmate";
    }, 5000);

    return () => clearTimeout(redirectTimer);
  }, []);

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-black text-white">
      <Navbar />

      <video
        className="absolute inset-0 -z-20 h-full w-full object-cover opacity-35"
        src="/image/coin-rain.mp4"
        autoPlay
        muted
        loop
        playsInline
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.72),rgba(0,0,0,0.9)_46%,#000)]" />

      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center justify-center px-6 py-32">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
            页面重定向
          </p>
          <h1 className="mt-2 text-4xl font-bold">快速下单已收纳</h1>
          <p className="mt-4 text-lg text-zinc-300">
            我们已经将下单流程整合到陽珠段位殢玉卧鼂逢舆。您可以在那里使用什遍一弃宣继策院貙竣紑抻訢府者。
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            正在跳转到陽珠段位殢玉卧鼂逢舆。如果没有自动跳转，请
            <Link href="/playmate" className="ml-1 text-cyan-200 underline hover:text-cyan-300">
              点击这里
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
