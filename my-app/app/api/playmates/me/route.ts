import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  if (!prisma) {
    return NextResponse.json({ isPlaymate: false });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) {
    return NextResponse.json({ isPlaymate: false }, { status: 401 });
  }

  const playmate = await prisma.playmate.findUnique({
    where: { discordId: session.user.discordId },
    select: {
      id: true,
      name: true,
      coinBalance: true,
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  return NextResponse.json({
    isPlaymate: Boolean(playmate),
    playmate,
  });
}
