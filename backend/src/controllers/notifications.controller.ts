import { Response } from "express";
import { prisma } from "../database/prisma.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { AuthRequest } from "../middleware/authenticate.js";

export async function listNotifications(req: AuthRequest, res: Response) {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.uid },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  sendSuccess(res, notifications);
}

export async function getUnreadCount(req: AuthRequest, res: Response) {
  const count = await prisma.notification.count({
    where: { userId: req.user!.uid, isRead: false },
  });
  sendSuccess(res, count);
}

export async function markRead(req: AuthRequest, res: Response) {
  const id = parseInt(String(req.params.id || req.params.jobId || req.params.bidId));
  if (isNaN(id)) { sendError(res, "Invalid notification ID", 400); return; }
  await prisma.notification.updateMany({ where: { id, userId: req.user!.uid }, data: { isRead: true } });
  sendSuccess(res, { ok: true });
}

export async function markAllRead(req: AuthRequest, res: Response) {
  await prisma.notification.updateMany({ where: { userId: req.user!.uid }, data: { isRead: true } });
  sendSuccess(res, { ok: true });
}
