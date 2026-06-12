import Navbar from "@/components/navbar";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="relative min-h-[calc(100vh-73px)] overflow-hidden">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src="/image/tumbnails.mp4"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="absolute inset-0 bg-black/60" />

        <div className="relative z-10 flex min-h-[calc(100vh-73px)] items-center px-6">
          <div className="mx-auto w-full max-w-6xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">
              欢迎来到 EE Studio
            </p>

            <h1 className="max-w-4xl text-5xl font-black leading-tight md:text-7xl">
              找到适合你的
              <span className="block text-zinc-300">游戏陪玩</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
              选择盲盒陪玩或指定陪玩，支持 Valorant、CS2、英雄联盟等游戏。
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/playmate"
                className="rounded-lg bg-white px-8 py-4 font-bold text-black transition hover:bg-cyan-200"
              >
                进入陪玩大厅
              </Link>

              <Link
                href="/appointment"
                className="rounded-lg border border-zinc-500 bg-black/40 px-8 py-4 font-bold text-white backdrop-blur transition hover:border-cyan-300"
              >
                快速下单
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
