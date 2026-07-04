import { Response } from "express";
import { prisma } from "../database/prisma.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { CreateReviewSchema } from "../validators/index.js";
import { AuthRequest } from "../middleware/authenticate.js";

export async function createReview(req: AuthRequest, res: Response) {
  const parse = CreateReviewSchema.safeParse(req.body);
  if (!parse.success) { sendError(res, parse.error.issues[0]?.message || "Validation error", 422); return; }
  const data = parse.data;

  const job = await prisma.job.findUnique({ where: { id: data.jobId }, select: { homeownerId: true, acceptedBidId: true, status: true } });
  if (!job) { sendError(res, "Job not found", 404); return; }
  if (job.homeownerId !== req.user!.uid) { sendError(res, "Only the homeowner can review", 403); return; }
  if (job.status !== "completed") { sendError(res, "Job must be completed first", 400); return; }
  if (!job.acceptedBidId) { sendError(res, "No provider on this job", 400); return; }

  const bid = await prisma.bid.findUnique({ where: { id: job.acceptedBidId }, select: { providerId: true } });
  if (!bid) { sendError(res, "Bid not found", 404); return; }

  await prisma.review.upsert({
    where: { jobId_reviewerId: { jobId: data.jobId, reviewerId: req.user!.uid } },
    update: { rating: data.rating, comment: data.comment },
    create: { jobId: data.jobId, reviewerId: req.user!.uid, providerId: bid.providerId, rating: data.rating, comment: data.comment },
  });
  sendSuccess(res, { ok: true });
}

export async function getJobReview(req: AuthRequest, res: Response) {
  const jobId = parseInt(String(req.params.id || req.params.jobId || req.params.bidId));
  if (isNaN(jobId)) { sendError(res, "Invalid job ID", 400); return; }

  const review = await prisma.review.findFirst({
    where: { jobId },
    select: { rating: true, comment: true },
  });
  sendSuccess(res, review ?? null);
}
