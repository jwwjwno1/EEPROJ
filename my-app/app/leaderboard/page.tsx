import Image from "next/image";
import Navbar from "@/components/navbar";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

const isValidImageSrc = (src?: string | null) =>
  Boolean(src && (src.startsWith("/") || src.startsWith("http://") || src.startsWith("https://")));

export default async function LeaderboardPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const playmates = prisma
    ? await prisma.playmate.findMany({
        include: {
          appointments: {
            where: {
              status: "completed",
              completedAt: {
                gte: monthStart,
                lt: nextMonthStart,
              },
            },
            select: {
              rating: true,
              ratingComment: true,
              completedAt: true,
              user: {
                select: { discordName: true },
              },
            },
          },
        },
      })
    : [];

  const rankedPlaymates = playmates
    .map((playmate) => {
      const ratedOrders = playmate.appointments.filter((appointment) => appointment.rating);
      const averageRating =
        ratedOrders.length > 0
          ? ratedOrders.reduce((total, appointment) => total + (appointment.rating ?? 0), 0) /
            ratedOrders.length
          : 0;

      return {
        ...playmate,
        completedOrders: playmate.appointments.length,
        averageRating,
        comments: playmate.appointments.filter((appointment) => appointment.ratingComment),
      };
    })
    .sort((a, b) => b.completedOrders - a.completedOrders || b.averageRating - a.averageRating);

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-300">
            Leaderboard
          </p>
          <h1 className="mt-2 text-4xl font-black">陪玩排行榜</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            排名以本月完成订单计算，每个月自动重新开始。订单数量相同则比较顾客评分，评分满分 10 分。
          </p>
          <p className="mt-2 text-sm text-cyan-300">
            当前月份：{monthStart.toLocaleDateString("zh-CN", { year: "numeric", month: "long" })}
          </p>
        </div>

        <div className="grid gap-4">
          {rankedPlaymates.map((playmate, index) => (
            <article
              key={playmate.id}
              className="grid gap-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4 sm:grid-cols-[auto_88px_1fr_auto] sm:items-center"
            >
              <div className="text-3xl font-black text-cyan-200">#{index + 1}</div>
              <div className="relative h-20 w-20 overflow-hidden rounded-lg bg-zinc-900">
                {isValidImageSrc(playmate.image) ? (
                  <Image
                    src={playmate.image as string}
                    alt={playmate.name}
                    fill
                    sizes="80px"
                    quality={100}
                    unoptimized={playmate.image?.startsWith("http")}
                    className="object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-sm text-zinc-500">
                    {playmate.name.slice(0, 1)}
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{playmate.name}</h2>
                <p className="mt-1 text-sm text-cyan-300">{playmate.game}</p>
                <p className="mt-2 text-sm text-zinc-400">{playmate.description}</p>
                {playmate.comments.length > 0 && (
                  <details className="mt-4 rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm">
                    <summary className="cursor-pointer font-bold text-zinc-200">
                      查看评论 ({playmate.comments.length})
                    </summary>
                    <div className="mt-3 grid gap-2">
                      {playmate.comments.map((comment) => (
                        <p
                          key={`${playmate.id}-${comment.completedAt?.toISOString() ?? comment.ratingComment}`}
                          className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-300"
                        >
                          <span className="font-semibold text-cyan-200">
                            {comment.user.discordName}：
                          </span>
                          {comment.ratingComment}
                        </p>
                      ))}
                    </div>
                  </details>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-center sm:w-52">
                <div className="rounded-lg border border-zinc-800 bg-black p-3">
                  <p className="text-xs text-zinc-500">完成订单</p>
                  <p className="mt-1 text-xl font-black">{playmate.completedOrders}</p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-black p-3">
                  <p className="text-xs text-zinc-500">评分</p>
                  <p className="mt-1 text-xl font-black">
                    {playmate.averageRating ? playmate.averageRating.toFixed(1) : "-"}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>

        {rankedPlaymates.length === 0 && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-10 text-center text-zinc-400">
            还没有陪玩资料。
          </div>
        )}
      </section>
    </main>
  );
}
