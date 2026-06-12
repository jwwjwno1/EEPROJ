import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ADMIN_DISCORD_IDS, authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

const isAdminSession = (discordId?: string) => Boolean(discordId && ADMIN_DISCORD_IDS.includes(discordId));
const getRequestId = (req: Request) => Number(new URL(req.url).pathname.split("/").pop());

export async function PATCH(req: Request) {
  if (!prisma) {
    return NextResponse.json({ error: "DATABASE_URL 尚未设置。" }, { status: 500 });
  }

  const session = await getServerSession(authOptions);
  const adminDiscordId = session?.user?.discordId;

  if (!isAdminSession(adminDiscordId)) {
    return NextResponse.json({ error: "只有管理员可以验证 TNG 充值。" }, { status: 403 });
  }

  const id = getRequestId(req);
  const action = String((await req.json()).action ?? "");

  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "不支持的验证操作。" }, { status: 400 });
  }

  const request = await prisma.coinRechargeRequest.findUnique({ where: { id } });

  if (!request) {
    return NextResponse.json({ error: "找不到充值申请。" }, { status: 404 });
  }

  if (request.status !== "pending") {
    return NextResponse.json({ error: "这笔充值已经处理过了。" }, { status: 400 });
  }

  const status = action === "approve" ? "approved" : "rejected";

  const updated = await prisma.$transaction(async (tx) => {
    const rechargeRequest = await tx.coinRechargeRequest.update({
      where: { id },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedBy: adminDiscordId,
      },
      include: {
        user: {
          select: {
            discordName: true,
            discordId: true,
            avatar: true,
            coinBalance: true,
          },
        },
      },
    });

    if (action === "approve") {
      await tx.user.update({
        where: { id: request.userId },
        data: { coinBalance: { increment: request.amount } },
      });
    }

    return rechargeRequest;
  });

  return NextResponse.json(updated);
}
