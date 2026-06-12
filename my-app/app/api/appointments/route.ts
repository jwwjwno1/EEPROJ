import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { getLateFee, getOrderCoins } from "@/app/lib/coins";
import { prisma } from "../../lib/prisma";

const getPrisma = () => {
  if (!prisma) {
    return null;
  }
  return prisma;
};

export async function GET(req: Request) {
  try {
    const prismaClient = getPrisma();
    if (!prismaClient) {
      return NextResponse.json({ error: "DATABASE_URL 尚未设置。" }, { status: 500 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "请先使用 Discord 登录。" }, { status: 401 });
    }

    const scope = new URL(req.url).searchParams.get("scope") ?? "mine";
    const user = await prismaClient.user.findUnique({
      where: { discordId: session.user.discordId },
    });

    if (!user) {
      return NextResponse.json({ error: "找不到 Discord 用户资料。" }, { status: 404 });
    }

    if (scope === "playmate") {
      const playmate = await prismaClient.playmate.findUnique({
        where: { discordId: session.user.discordId },
      });

      if (!playmate) {
        return NextResponse.json(
          { error: "只有已绑定 Discord ID 的陪玩可以查看陪玩订单。" },
          { status: 403 },
        );
      }

      const appointments = await prismaClient.appointment.findMany({
        where: { playmateId: playmate.id },
        include: {
          user: true,
          playmate: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json(appointments);
    }

    const appointments = await prismaClient.appointment.findMany({
      where: { userId: user.id },
      include: {
        user: true,
        playmate: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error("Failed to load appointments", error);
    return NextResponse.json({ error: "无法读取订单，请确认数据库 migration 已执行。" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const prismaClient = getPrisma();
  if (!prismaClient) {
    return NextResponse.json({ error: "DATABASE_URL 尚未设置。" }, { status: 500 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: "请先使用 Discord 登录。" }, { status: 401 });
  }

  const user = await prismaClient.user.findUnique({
    where: { discordId: session.user.discordId },
  });

  if (!user) {
    return NextResponse.json({ error: "找不到 Discord 用户资料。" }, { status: 404 });
  }

  const { playmateId, appointment, duration } = await req.json();
  const parsedPlaymateId = Number(playmateId);
  const parsedDuration = Number(duration);
  const parsedAppointment = new Date(appointment);

  if (
    !parsedPlaymateId ||
    !parsedDuration ||
    Number.isNaN(parsedAppointment.getTime())
  ) {
    return NextResponse.json(
      { error: "请填写陪玩、预约时间和服务时长。" },
      { status: 400 },
    );
  }

  if (parsedAppointment <= new Date()) {
    return NextResponse.json(
      { error: "预约时间必须是未来时间。" },
      { status: 400 },
    );
  }

  if (parsedDuration < 30) {
    return NextResponse.json(
      { error: "服务时长至少 30 分钟。" },
      { status: 400 },
    );
  }

  const playmate = await prismaClient.playmate.findUnique({
    where: { id: parsedPlaymateId },
  });

  if (!playmate) {
    return NextResponse.json({ error: "找不到陪玩资料。" }, { status: 404 });
  }

  const baseCost = getOrderCoins(playmate.price, parsedDuration, playmate.role);
  const lateFee = getLateFee(parsedAppointment);
  const coinCost = baseCost + lateFee;

  if (user.coinBalance < coinCost) {
    return NextResponse.json(
      { error: `金币不足，本单需要 ${coinCost} 金币，当前只有 ${user.coinBalance} 金币。` },
      { status: 400 },
    );
  }

  const created = await prismaClient.$transaction(async (tx) => {
    const appointmentRecord = await tx.appointment.create({
      data: {
        userId: user.id,
        playmateId: parsedPlaymateId,
        appointment: parsedAppointment,
        duration: parsedDuration,
        coinCost,
        lateFee,
        chargedAt: new Date(),
      },
      include: { user: true, playmate: true },
    });

    await tx.user.update({
      where: { id: user.id },
      data: { coinBalance: { decrement: coinCost } },
    });

    return appointmentRecord;
  });

  return NextResponse.json(created);
}
