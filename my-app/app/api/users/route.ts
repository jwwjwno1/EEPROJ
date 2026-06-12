import { NextResponse } from "next/server";
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
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 500 });
  }

  const users = await prismaClient.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const prismaClient = getPrisma();
  if (!prismaClient) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 500 });
  }

  const body = await req.json();
  const discordId = String(body.discordId ?? "").trim();
  const discordName = String(body.discordName ?? "").trim();
  const avatar = String(body.avatar ?? "").trim();

  if (!discordId || !discordName) {
    return NextResponse.json(
      { error: "Discord ID and Discord name are required." },
      { status: 400 },
    );
  }

  const user = await prismaClient.user.upsert({
    where: { discordId },
    update: {
      discordName,
      avatar: avatar || null,
    },
    create: {
      discordId,
      discordName,
      avatar: avatar || null,
    },
  });

  return NextResponse.json(user);
}
