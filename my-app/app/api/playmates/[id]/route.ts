import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ADMIN_DISCORD_IDS, authOptions } from "@/app/lib/auth";
import { prisma } from "../../../lib/prisma";

const getPrisma = () => {
  if (!prisma) {
    return null;
  }
  return prisma;
};

const getPlaymateSaveError = (error: unknown) => {
  const err = error as any;

  // Prisma unique constraint error
  if (err?.code === "P2002") {
    return "这个 Discord ID 已经绑定到其他陪玩资料。";
  }

  // Prisma record not found
  if (err?.code === "P2025") {
    return "找不到陪玩资料。";
  }

  // Prisma validation error (fallback)
  if (err?.name === "PrismaClientValidationError") {
    return `无法保存陪玩资料。Prisma validation: ${err.message}`;
  }

  // normal JS error
  if (error instanceof Error) {
    return `无法保存陪玩资料。${error.message}`;
  }

  return "无法保存陪玩资料。";
};

export async function PUT(req: Request) {
  const prismaClient = getPrisma();
  if (!prismaClient) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 500 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId || !ADMIN_DISCORD_IDS.includes(session.user.discordId)) {
    return NextResponse.json({ error: "只有管理员可以编辑陪玩。" }, { status: 403 });
  }

  const body = await req.json();
  const { name, game, price, role, description, image, discordId } = body;
  const id = Number(new URL(req.url).pathname.split("/").pop());
  const parsedName = String(name ?? "").trim();
  const parsedGame = String(game ?? "").trim();
  const parsedDescription = String(description ?? "").trim();
  const parsedPrice = Number(price);
  const hasRole = Object.prototype.hasOwnProperty.call(body, "role");
  const parsedRole = String(role ?? "").trim();

  if (
    !id ||
    !parsedName ||
    !parsedGame ||
    !parsedDescription ||
    !Number.isInteger(parsedPrice) ||
    parsedPrice <= 0 ||
    (hasRole && !["技术陪玩", "娱乐陪玩"].includes(parsedRole))
  ) {
    return NextResponse.json(
      { error: "请填写昵称、游戏、简介，并确认价格是大于 0 的整数。" },
      { status: 400 },
    );
  }

  const data = {
    name: parsedName,
    game: parsedGame,
    price: parsedPrice,
    description: parsedDescription,
    image: String(image ?? "").trim() || null,
    ...(hasRole ? { role: parsedRole } : {}),
    ...(Object.prototype.hasOwnProperty.call(body, "discordId")
      ? { discordId: String(discordId ?? "").trim() || null }
      : {}),
  };

  try {
    const playmate = await prismaClient.playmate.update({
      where: { id },
      data,
    });

    return NextResponse.json(playmate);
  } catch (error) {
    console.error("Failed to update playmate:", error);
    const message = getPlaymateSaveError(error);
    return NextResponse.json({ error: message }, { status: message === "找不到陪玩资料。" ? 404 : 500 });
  }
}

export async function DELETE(req: Request) {
  const prismaClient = getPrisma();
  if (!prismaClient) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 500 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId || !ADMIN_DISCORD_IDS.includes(session.user.discordId)) {
    return NextResponse.json({ error: "只有管理员可以删除陪玩。" }, { status: 403 });
  }

  const id = Number(new URL(req.url).pathname.split("/").pop());
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "陪玩 ID 不正确。" }, { status: 400 });
  }

  const playmate = await prismaClient.playmate.findUnique({ where: { id } });
  if (!playmate) {
    return NextResponse.json({ error: "找不到陪玩资料。" }, { status: 404 });
  }

  await prismaClient.$transaction(async (tx: any) => {
    const chargedOpenOrders = await tx.appointment.findMany({
      where: {
        playmateId: id,
        chargedAt: { not: null },
        status: { in: ["pending", "accepted"] },
        coinCost: { gt: 0 },
      },
      select: { userId: true, coinCost: true },
    });

    for (const order of chargedOpenOrders) {
      await tx.user.update({
        where: { id: order.userId },
        data: { coinBalance: { increment: order.coinCost } },
      });
    }

    await tx.playmateCoinTransaction.deleteMany({ where: { playmateId: id } });
    await tx.giftRecord.deleteMany({ where: { playmateId: id } });
    await tx.appointment.deleteMany({ where: { playmateId: id } });
    await tx.playmate.delete({ where: { id } });
  });

  return NextResponse.json({ success: true });
}
