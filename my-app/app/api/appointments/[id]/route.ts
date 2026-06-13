import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { prisma } from "../../../lib/prisma";


const getPrisma = () => {
  if (!prisma) return null;
  return prisma;
};

const getAppointmentId = (req: Request) => {
  const segments = new URL(req.url).pathname.split("/");
  const last = segments.filter(Boolean).pop();
  return Number(last);
};

export async function PATCH(req: Request) {
  try {
    const prismaClient = getPrisma();
    if (!prismaClient) {
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

    const id = getAppointmentId(req);
    if (!Number.isInteger(id)) {
      return NextResponse.json(
        { error: "订单 ID 不正确。" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "订单操作内容不正确。" },
        { status: 400 }
      );
    }

    const action = typeof body.action === "string" ? body.action : "";

    const appointment = await prismaClient.appointment.findUnique({
      where: { id },
      include: { user: true, playmate: true },
    });

    if (!appointment) {
      return NextResponse.json({ error: "找不到订单。" }, { status: 404 });
    }

    const includeFull = { user: true, playmate: true };

    // =========================
    // ACCEPT
    // =========================
    if (action === "accept") {
      if (appointment.playmate.discordId !== session.user.discordId) {
        return NextResponse.json(
          { error: "只有该陪玩可以接受订单。" },
          { status: 403 }
        );
      }

      if (appointment.status !== "pending") {
        return NextResponse.json(
          { error: "只有等待接单的订单可以接受。" },
          { status: 400 }
        );
      }

      const updated = await prismaClient.appointment.update({
        where: { id },
        data: { status: "accepted", acceptedAt: new Date() },
        include: includeFull,
      });

      return NextResponse.json(updated);
    }

    // =========================
    // REJECT
    // =========================
    if (action === "reject") {
      const rejectReason = String(body.reason ?? "").trim();

      if (appointment.playmate.discordId !== session.user.discordId) {
        return NextResponse.json(
          { error: "只有该陪玩可以拒绝订单。" },
          { status: 403 }
        );
      }

      if (appointment.status !== "pending") {
        return NextResponse.json(
          { error: "只有等待接单的订单可以拒绝。" },
          { status: 400 }
        );
      }

      if (!rejectReason) {
        return NextResponse.json(
          { error: "请填写拒绝原因。" },
          { status: 400 }
        );
      }

      const coinCost = appointment.coinCost;
      const userId = appointment.userId;

      const updated = await prismaClient.$transaction(async (tx) => {
        const appointmentRecord = await tx.appointment.update({
          where: { id },
          data: {
            status: "rejected",
            rejectReason,
            rejectedAt: new Date(),
            chargedAt: null,
          },
          include: includeFull,
        });

        if (coinCost > 0) {
          await tx.user.update({
            where: { id: userId },
            data: {
              coinBalance: {
                increment: coinCost,
              },
            },
          });
        }

        return appointmentRecord;
      });

      return NextResponse.json(updated);
    }

    // =========================
    // COMPLETE
    // =========================
    if (action === "complete") {
      const proofImage = String(body.proofImage ?? "").trim();

      if (appointment.playmate.discordId !== session.user.discordId) {
        return NextResponse.json(
          { error: "只有该陪玩可以完成订单。" },
          { status: 403 }
        );
      }

      if (appointment.status !== "accepted") {
        return NextResponse.json(
          { error: "只有接单中的订单可以完成。" },
          { status: 400 }
        );
      }

      if (!proofImage) {
        return NextResponse.json(
          { error: "请先上传战绩证明照片。" },
          { status: 400 }
        );
      }

      const coinCost = appointment.coinCost;
      const playmateId = appointment.playmateId;

      const updated = await prismaClient.$transaction(async (tx) => {
        const appointmentRecord = await tx.appointment.update({
          where: { id },
          data: {
            status: "completed",
            completedAt: new Date(),
            proofImage,
          },
          include: includeFull,
        });

        if (coinCost > 0) {
          await tx.playmate.update({
            where: { id: playmateId },
            data: {
              coinBalance: {
                increment: coinCost,
              },
            },
          });

          await tx.playmateCoinTransaction.create({
            data: {
              playmateId,
              amount: coinCost,
              type: "order",
              appointmentId: id,
              note: `订单 #${id} 完成收入`,
            },
          });
        }

        return appointmentRecord;
      });

      return NextResponse.json(updated);
    }

    // =========================
    // RATE
    // =========================
    if (action === "rate") {
      const rating = Number(body.rating);
      const comment = String(body.comment ?? "").trim();

      if (appointment.user.discordId !== session.user.discordId) {
        return NextResponse.json(
          { error: "只有下单顾客可以评分。" },
          { status: 403 }
        );
      }

      if (appointment.status !== "completed") {
        return NextResponse.json(
          { error: "订单完成后才可以评分。" },
          { status: 400 }
        );
      }

      if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
        return NextResponse.json(
          { error: "评分必须是 1 到 10 分。" },
          { status: 400 }
        );
      }

      const updated = await prismaClient.appointment.update({
        where: { id },
        data: {
          rating,
          ratingComment: comment || null,
        },
        include: includeFull,
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json(
      { error: "不支持的订单操作。" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Failed to update appointment", error);

    const detail = error instanceof Error ? `：${error.message}` : "";

    return NextResponse.json(
      {
        error: `无法更新订单，请确认数据库 migration 已执行${detail}`,
      },
      { status: 500 }
    );
  }
}