import { Response } from "express";
import { prisma } from "../database/prisma.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { AuthRequest } from "../middleware/authenticate.js";

export async function getPayment(req: AuthRequest, res: Response) {
  const jobId = parseInt(String(req.params.id || req.params.jobId || req.params.bidId));
  if (isNaN(jobId)) { sendError(res, "Invalid job ID", 400); return; }
  const payment = await prisma.payment.findUnique({ where: { jobId } });
  sendSuccess(res, payment ?? null);
}

export async function holdPayment(req: AuthRequest, res: Response) {
  const jobId = parseInt(String(req.params.jobId || req.body.jobId));
  if (isNaN(jobId)) { sendError(res, "Invalid job ID", 400); return; }

  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { homeownerId: true } });
  if (!job || job.homeownerId !== req.user!.uid) { sendError(res, "Forbidden", 403); return; }

  await prisma.payment.updateMany({ where: { jobId, status: "pending" }, data: { status: "held", updatedAt: new Date() } });
  sendSuccess(res, { ok: true });
}

export async function releasePayment(req: AuthRequest, res: Response) {
  const jobId = parseInt(String(req.params.jobId || req.body.jobId));
  if (isNaN(jobId)) { sendError(res, "Invalid job ID", 400); return; }

  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { homeownerId: true } });
  if (!job || job.homeownerId !== req.user!.uid) { sendError(res, "Forbidden", 403); return; }

  await prisma.payment.updateMany({ where: { jobId, status: "held" }, data: { status: "released", updatedAt: new Date() } });
  sendSuccess(res, { ok: true });
}
