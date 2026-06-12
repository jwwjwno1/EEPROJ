import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ADMIN_DISCORD_IDS, authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  if (!prisma) {
    return NextResponse.json({ error: "DATABASE_URL 尚未设置。" }, { status: 500 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId || !ADMIN_DISCORD_IDS.includes(session.user.discordId)) {
    return NextResponse.json({ error: "只有管理员可以查看陪玩业绩。" }, { status: 403 });
  }

  const transactions = await prisma.playmateCoinTransaction.findMany({
    include: { playmate: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(transactions);
}
