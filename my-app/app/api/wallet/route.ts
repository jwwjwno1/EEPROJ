import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

const coinPackages = new Set([20, 50, 100, 200, 500]);

export async function GET() {
  if (!prisma) {
    return NextResponse.json({ error: "DATABASE_URL 尚未设置。" }, { status: 500 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: "请先使用 Discord 登录。" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { discordId: session.user.discordId },
    select: { coinBalance: true },
  });

  if (!user) {
    return NextResponse.json({ error: "找不到 Discord 用户资料。" }, { status: 404 });
  }

  return NextResponse.json({ coinBalance: user.coinBalance });
}

export async function POST(req: Request) {
  if (!prisma) {
    return NextResponse.json({ error: "DATABASE_URL 尚未设置。" }, { status: 500 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: "请先使用 Discord 登录。" }, { status: 401 });
  }

  const body = await req.json();
  const amount = Number(body.amount);
  const transferName = String(body.transferName ?? "").trim();

  if (!coinPackages.has(amount)) {
    return NextResponse.json({ error: "请选择有效的充值配套。" }, { status: 400 });
  }

  if (!transferName) {
    return NextResponse.json({ error: "请填写转账用户名。" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { discordId: session.user.discordId },
    select: { id: true, coinBalance: true },
  });

  if (!user) {
    return NextResponse.json({ error: "找不到 Discord 用户资料。" }, { status: 404 });
  }

  const request = await prisma.coinRechargeRequest.create({
    data: {
      userId: user.id,
      amount,
      transferName,
    },
  });

  return NextResponse.json({
    coinBalance: user.coinBalance,
    request,
    message: "充值申请已提交，等待 admin 验证。",
  });
}
