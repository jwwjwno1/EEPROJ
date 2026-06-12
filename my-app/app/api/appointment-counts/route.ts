import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { prisma } from "../../lib/prisma";

const getPrisma = () => {
  if (!prisma) {
    return null;
  }

  return prisma;
};

export async function GET() {
  const prismaClient = getPrisma();
  if (!prismaClient) {
    return NextResponse.json({ error: "DATABASE_URL 尚未设置。" }, { status: 500 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) {
    return NextResponse.json({ mine: 0, playmate: 0 });
  }

  const user = await prismaClient.user.findUnique({
    where: { discordId: session.user.discordId },
    select: { id: true },
  });
  const playmate = await prismaClient.playmate.findUnique({
    where: { discordId: session.user.discordId },
    select: { id: true },
  });

  const [mine, playmateOrders] = await Promise.all([
    user
      ? prismaClient.appointment.count({
          where: {
            userId: user.id,
            status: { in: ["pending", "accepted"] },
          },
        })
      : 0,
    playmate
      ? prismaClient.appointment.count({
          where: {
            playmateId: playmate.id,
            status: "pending",
          },
        })
      : 0,
  ]);

  return NextResponse.json({ mine, playmate: playmateOrders });
}
