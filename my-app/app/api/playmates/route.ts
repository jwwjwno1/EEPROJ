import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";

import { ADMIN_DISCORD_IDS, authOptions } from "@/app/lib/auth";
import { prisma } from "../../lib/prisma";

const getPrisma = () => {
  return prisma ?? null;
};

const getPlaymateSaveError = (error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return "这个 Discord ID 已经绑定到其他陪玩资料。";
    }

    return `无法保存陪玩资料。Prisma ${error.code}: ${error.message}`;
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return `无法保存陪玩资料。Prisma validation: ${error.message}`;
  }

  if (error instanceof Error) {
    return `无法保存陪玩资料。${error.message}`;
  }

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

  const playmates = await prismaClient.playmate.findMany();

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
  const price = Number(body.price);
  const role = String(body.role ?? "娱乐陪玩").trim();
  const image = String(body.image ?? "").trim();
  const discordId = String(body.discordId ?? "").trim();

  if (
    !name ||
    !game ||
    !description ||
    !Number.isInteger(price) ||
    price <= 0 ||
    !["技术陪玩", "娱乐陪玩"].includes(role)
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