"use client";

import { useEffect } from "react";
import Navbar from "@/components/navbar";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      void signIn("discord", { callbackUrl: "/profile" });
    }
  }, [status]);

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-32 text-center">
        <div className="w-full">
          <h1 className="text-4xl font-bold">
            {status === "authenticated" ? "已成功登录" : "正在打开 Discord 登录..."}
          </h1>
          <p className="mt-4 text-zinc-400">
            {status === "authenticated"
              ? `欢迎回来，${session.user?.name ?? "Discord 用户"}。`
              : "请在 Discord 授权页面继续。"}
          </p>
          {status === "authenticated" && (
            <Link
              href="/profile"
              className="mt-8 inline-flex rounded-xl bg-white px-6 py-3 font-bold text-black"
            >
              查看个人资料
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
