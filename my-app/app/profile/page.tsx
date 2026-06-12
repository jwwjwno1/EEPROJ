import { getServerSession } from "next-auth";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/navbar";
import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <main className="min-h-screen bg-black text-white">
        <Navbar />

        <section className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-32">
          <div className="w-full rounded-3xl border border-zinc-800 bg-zinc-900 p-10">
            <h1 className="text-4xl font-bold">个人资料</h1>
            <p className="mt-4 text-zinc-400">
              请先使用 Discord 登录后查看个人资料。
            </p>
            <Link
              href="/login"
              className="mt-8 inline-flex rounded-xl bg-white px-6 py-3 font-bold text-black"
            >
              前往登录
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const savedUser =
    prisma && session.user.discordId
      ? await prisma.user.findUnique({
          where: { discordId: session.user.discordId },
        })
      : null;

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="mx-auto min-h-screen max-w-4xl px-6 py-32">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 md:p-10">
          <div className="flex flex-col gap-8 md:flex-row md:items-center">
            <div className="relative h-28 w-28 overflow-hidden rounded-3xl border border-zinc-700 bg-black">
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name ?? "Discord 头像"}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-black">
                  {(session.user.name ?? "D").slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>

            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
                Discord 个人资料
              </p>
              <h1 className="mt-3 text-4xl font-black">
                {savedUser?.discordName ?? session.user.name ?? "Discord 用户"}
              </h1>
              <p className="mt-3 text-zinc-400">
                你的 Discord 登录已连接到 EE Studio。
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-black p-5">
              <p className="text-sm text-zinc-500">Discord ID</p>
              <p className="mt-2 break-all font-semibold">
                {session.user.discordId ?? savedUser?.discordId ?? "暂无资料"}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-black p-5">
              <p className="text-sm text-zinc-500">平台身份</p>
              <p className="mt-2 font-semibold">{savedUser?.role ?? "user"}</p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-black p-5">
              <p className="text-sm text-zinc-500">Email</p>
              <p className="mt-2 break-all font-semibold">
                {session.user.email ?? "Discord 未提供"}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-black p-5">
              <p className="text-sm text-zinc-500">系统用户 ID</p>
              <p className="mt-2 font-semibold">{savedUser?.id ?? "等待同步"}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
