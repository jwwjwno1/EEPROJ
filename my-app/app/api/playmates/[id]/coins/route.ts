import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ADMIN_DISCORD_IDS, authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function PATCH(req: Request) {
  if (!prisma) {
    return NextResponse.json({ error: "DATABASE_URL 尚未设置。" }, { status: 500 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId || !ADMIN_DISCORD_IDS.includes(session.user.discordId)) {
    return NextResponse.json({ error: "只有管理员可以调整陪玩金币。" }, { status: 403 });
  }

  const id = Number(new URL(req.url).pathname.split("/").at(-2));
  const body = await req.json();
  const amount = Number(body.amount);
  const note = String(body.note ?? "").trim();

  if (!id || !Number.isInteger(amount) || amount === 0) {
    return NextResponse.json({ error: "请输入非 0 的整数金币数量。" }, { status: 400 });
  }

  const playmate = await prisma.playmate.findUnique({ where: { id } });
  if (!playmate) {
    return NextResponse.json({ error: "找不到陪玩资料。" }, { status: 404 });
  }

  if (amount < 0 && playmate.coinBalance + amount < 0) {
    return NextResponse.json({ error: "扣除后陪玩金币不能低于 0。" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx: any) => {
    const updatedPlaymate = await tx.playmate.update({
      where: { id },
      data: { coinBalance: { increment: amount } },
    });

    await tx.playmateCoinTransaction.create({
      data: {
        playmateId: id,
        amount,
        type: "admin",
        note: note || (amount > 0 ? "Admin 添加金币" : "Admin 扣除金币"),
      },
    });

    return updatedPlaymate;
  });

  return NextResponse.json(updated);
}
