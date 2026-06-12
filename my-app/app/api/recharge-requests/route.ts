import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ADMIN_DISCORD_IDS, authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

const isAdminSession = (discordId?: string) => Boolean(discordId && ADMIN_DISCORD_IDS.includes(discordId));

export async function GET() {
  if (!prisma) {
    return NextResponse.json({ error: "DATABASE_URL 尚未设置。" }, { status: 500 });
  }

  const session = await getServerSession(authOptions);
  if (!isAdminSession(session?.user?.discordId)) {
    return NextResponse.json({ error: "只有管理员可以查看 TNG 验证。" }, { status: 403 });
  }

  const requests = await prisma.coinRechargeRequest.findMany({
    include: {
      user: {
        select: {
          discordName: true,
          discordId: true,
          avatar: true,
          coinBalance: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(requests);
}
