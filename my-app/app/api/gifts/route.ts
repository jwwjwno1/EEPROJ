import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ADMIN_DISCORD_IDS, authOptions } from "@/app/lib/auth";
import { giftOptions } from "@/app/lib/coins";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  if (!prisma) {
    return NextResponse.json(
      { error: "DATABASE_URL 尚未设置。" },
      { status: 500 }
    );
  }

  const session = await getServerSession(authOptions);

  if (
    !session?.user?.discordId ||
    !ADMIN_DISCORD_IDS.includes(session.user.discordId)
  ) {
    return NextResponse.json(
      { error: "只有管理员可以查看礼物记录。" },
      { status: 403 }
    );
  }

  const gifts = await prisma.giftRecord.findMany({
    include: { user: true, playmate: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(gifts);
}

export async function POST(req: Request) {
  if (!prisma) {
    return NextResponse.json(
      { error: "DATABASE_URL 尚未设置。" },
      { status: 500 }
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) {
    return NextResponse.json(
      { error: "请先使用 Discord 登录。" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { error: "请求数据格式错误。" },
      { status: 400 }
    );
  }

  const playmateId = Number(body.playmateId);
  const giftName = String(body.giftName ?? "").trim();

  const gift = giftOptions.find((g) => g.name === giftName);

  if (!Number.isInteger(playmateId) || !gift) {
    return NextResponse.json(
      { error: "请选择有效的陪玩和礼物。" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { discordId: session.user.discordId },
  });

  if (!user) {
    return NextResponse.json(
      { error: "找不到 Discord 用户资料。" },
      { status: 404 }
    );
  }

  const playmate = await prisma.playmate.findUnique({
    where: { id: playmateId },
  });

  if (!playmate) {
    return NextResponse.json(
      { error: "找不到陪玩资料。" },
      { status: 404 }
    );
  }

  if (user.coinBalance < gift.coinCost) {
    return NextResponse.json(
      {
        error: `金币不足，${gift.name} 需要 ${gift.coinCost} 金币，当前只有 ${user.coinBalance} 金币。`,
      },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const giftRecord = await tx.giftRecord.create({
      data: {
        userId: user.id,
        playmateId,
        giftName: gift.name,
        coinCost: gift.coinCost,
      },
      include: { user: true, playmate: true },
    });

    const updatedUser = await tx.user.update({
      where: { id: user.id },
      data: {
        coinBalance: {
          decrement: gift.coinCost,
        },
      },
      select: { coinBalance: true },
    });

    await tx.playmate.update({
      where: { id: playmateId },
      data: {
        coinBalance: {
          increment: gift.coinCost,
        },
      },
    });

    await tx.playmateCoinTransaction.create({
      data: {
        playmateId,
        amount: gift.coinCost,
        type: "gift",
        giftId: giftRecord.id,
        note: `${user.discordName} 送出 ${gift.name}`,
      },
    });

    return {
      giftRecord,
      coinBalance: updatedUser.coinBalance,
    };
  });

  return NextResponse.json(result);
}