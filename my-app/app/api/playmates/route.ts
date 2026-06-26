import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";

import { ADMIN_DISCORD_IDS, authOptions } from "@/app/lib/auth";
import { prisma } from "../../lib/prisma";

const getPrisma = () => {
  return prisma ?? null;
};

const getPlaymateSaveError = (error: unknown) => {
  const err = error as any;

  // Prisma unique constraint error (P2002)
  if (err?.code === "P2002") {
    return "这个 Discord ID 已经绑定到其他陪玩资料。";
  }

  // Prisma validation error (best-effort check)
  if (err?.name === "PrismaClientValidationError") {
    return `无法保存陪玩资料。Prisma validation: ${err.message}`;
  }

  // Normal JS error
  if (error instanceof Error) {
    return `无法保存陪玩资料。${error.message}`;
  }

  // fallback
  return "无法保存陪玩资料。";
};

export async function GET() {
  const prismaClient = getPrisma();
  if (!prismaClient) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured." },
      { status: 500 }
    );
  }

  const session = await getServerSession(authOptions);

  const isAdmin = Boolean(
    session?.user?.discordId &&
      ADMIN_DISCORD_IDS.includes(session.user.discordId)
  );

  const playmates = await prismaClient.playmate.findMany({
    select: {
      id: true,
      name: true,
      game: true,
      price: true,
      role: true,
      description: true,
      image: true,
      ranks: true,
      discordId: true,
      createdAt: true,
    },
  });

  return NextResponse.json(
    isAdmin
      ? playmates
      : playmates.map((playmate) => ({
          id: playmate.id,
          name: playmate.name,
          game: playmate.game,
          price: playmate.price,
          role: playmate.role,
          description: playmate.description,
          image: playmate.image,
          ranks: playmate.ranks ?? [],
          createdAt: playmate.createdAt,
        }))
  );
}

export async function POST(req: Request) {
  const prismaClient = getPrisma();
  if (!prismaClient) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured." },
      { status: 500 }
    );
  }

  const session = await getServerSession(authOptions);
  if (
    !session?.user?.discordId ||
    !ADMIN_DISCORD_IDS.includes(session.user.discordId)
  ) {
    return NextResponse.json(
      { error: "只有管理员可以新增陪玩。" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { error: "请求数据格式错误。" },
      { status: 400 }
    );
  }

  const name = String(body.name ?? "").trim();
  const game = String(body.game ?? "").trim();
  const description = String(body.description ?? "").trim();
  const price = Number(body.price ?? 0);
  const role = String(body.role ?? "娱乐陪玩").trim();
  const image = String(body.image ?? "").trim();
  const discordId = String(body.discordId ?? "").trim();
  const ranks = Array.isArray(body.ranks) ? body.ranks : [];

  const isValidRank = (rank: unknown) => {
    return (
      rank &&
      typeof rank === "object" &&
      typeof (rank as any).name === "string" &&
      (rank as any).name.trim().length > 0 &&
      Number.isInteger((rank as any).price) &&
      (rank as any).price > 0 &&
      (typeof (rank as any).description === "undefined" || typeof (rank as any).description === "string")
    );
  };

  const isValidPrice =
    role === "段位"
      ? Number.isInteger(price) && price >= 0
      : Number.isInteger(price) && price > 0;

  if (
    !name ||
    !game ||
    !description ||
    !isValidPrice ||
    !["技术陪玩", "娱乐陪玩", "段位"].includes(role) ||
    !ranks.every(isValidRank) ||
    (role === "段位" && ranks.length === 0)
  ) {
    return NextResponse.json(
      {
        error:
          "请填写昵称、游戏、简介，并确认价格是大于 0 的整数。",
      },
      { status: 400 }
    );
  }

  try {
    const playmate = await prismaClient.playmate.create({
      data: {
        name,
        game,
        price,
        role,
        description,
        image: image || null,
        ranks: ranks.length > 0 ? ranks : Prisma.JsonNull,
        discordId: discordId || null,
      },
    });

    return NextResponse.json(playmate);
  } catch (error) {
    console.error("Failed to save playmate:", error);

    return NextResponse.json(
      { error: getPlaymateSaveError(error) },
      { status: 500 }
    );
  }
}