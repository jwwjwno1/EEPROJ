import Navbar from "@/components/navbar";
import Link from "next/link";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="max-w-4xl mx-auto py-32 px-6 text-center">
        <h1 className="text-5xl font-bold mb-10">
          联系我们
        </h1>

        <div className="space-y-4 text-lg text-zinc-400">
          <p>邮箱：support@eestudio.com</p>
          <p>
            加入 Discord：
            <Link className="text-cyan-200 underline-offset-4 hover:underline" href="https://discord.gg/sfTK8csgg8">
              EE Studio 官方频道
            </Link>
          </p>
          <p>
            官方 Instagram / 更多陪玩资料：
            <Link
              className="text-cyan-200 underline-offset-4 hover:underline"
              href="https://www.instagram.com/ee.studio66/?hl=en"
            >
              @ee.studio66
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
