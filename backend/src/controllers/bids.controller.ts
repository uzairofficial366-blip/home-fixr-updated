import { Response } from "express";
import { prisma } from "../database/prisma.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { CreateBidSchema } from "../validators/index.js";
import { AuthRequest } from "../middleware/authenticate.js";

async function expireTimedOutJobs() {
  await prisma.$executeRaw`
    UPDATE jobs SET status = 'expired'
    WHERE status = 'open'
      AND created_at <= NOW() - INTERVAL '10 minutes'
      AND NOT EXISTS (SELECT 1 FROM bids WHERE job_id = jobs.id)
  `;
}

export async function createBid(req: AuthRequest, res: Response) {
  if (req.user!.role !== "provider") { sendError(res, "Only providers can bid", 403); return; }

  const parse = CreateBidSchema.safeParse(req.body);
  if (!parse.success) { sendError(res, parse.error.issues[0]?.message || "Validation error", 422); return; }
  const data = parse.data;

  await expireTimedOutJobs();

  const job = await prisma.job.findUnique({ where: { id: data.jobId }, select: { status: true, category: true, homeownerId: true, title: true, budget: true } });
  if (!job) { sendError(res, "Job not found", 404); return; }
  if (job.status !== "open") { sendError(res, "Job is not accepting bids", 400); return; }

  const eligible = await prisma.$queryRaw<{ user_id: number }[]>`
    SELECT user_id FROM provider_profiles
    WHERE user_id = ${req.user!.uid} AND is_available = true AND verification_status = 'verified'
      AND ${job.category} = ANY(categories) LIMIT 1
  `;
  if (eligible.length === 0) { sendError(res, "This job is only available to verified providers who offer this service.", 403); return; }

  const total = data.hourlyRate * data.hoursEstimate + data.equipmentCost;

  const bid = await prisma.bid.upsert({
    where: { jobId_providerId: { jobId: data.jobId, providerId: req.user!.uid } },
    update: { hourlyRate: data.hourlyRate, hoursEstimate: data.hoursEstimate, equipmentCost: data.equipmentCost, total, message: data.message ?? "" },
    create: { jobId: data.jobId, providerId: req.user!.uid, hourlyRate: data.hourlyRate, hoursEstimate: data.hoursEstimate, equipmentCost: data.equipmentCost, total, message: data.message ?? "" },
  });

  await prisma.notification.create({
    data: {
      userId: job.homeownerId,
      title: "Provider offer received",
      body: `Original Budget: ${Number(job.budget || 0) > 0 ? "PKR " + Number(job.budget).toLocaleString() : "Not specified"}. Provider's Offered Price: PKR ${total.toLocaleString()}${data.message ? ". Note: " + data.message : ""}`,
      link: `/jobs/${data.jobId}`,
    },
  });
  sendSuccess(res, { id: bid.id, total: Number(bid.total) }, 201);
}

export async function listBidsForJob(req: AuthRequest, res: Response) {
  const jobId = parseInt(String(req.params.id || req.params.jobId || req.params.bidId));
  if (isNaN(jobId)) { sendError(res, "Invalid job ID", 400); return; }

  await expireTimedOutJobs();
  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { homeownerId: true, acceptedBidId: true } });
  if (!job) { sendError(res, "Job not found", 404); return; }

  if (job.homeownerId === req.user!.uid || req.user!.role === "admin") {
    const rows = await prisma.$queryRaw<unknown[]>`
      SELECT b.*, u.name AS provider_name, u.email AS provider_email,
        pp.verification_status,
        COALESCE((SELECT AVG(rating)::float FROM reviews r WHERE r.provider_id = b.provider_id), 0) AS avg_rating,
        (SELECT COUNT(*)::int FROM reviews r WHERE r.provider_id = b.provider_id) AS review_count
      FROM bids b
      JOIN users u ON u.id = b.provider_id
      LEFT JOIN provider_profiles pp ON pp.user_id = b.provider_id
      WHERE b.job_id = ${jobId} ORDER BY b.total ASC
    `;
    sendSuccess(res, rows); return;
  }
  if (req.user!.role === "provider") {
    const rows = await prisma.$queryRaw<unknown[]>`
      SELECT b.*, u.name AS provider_name FROM bids b JOIN users u ON u.id = b.provider_id
      WHERE b.job_id = ${jobId} AND b.provider_id = ${req.user!.uid}
    `;
    sendSuccess(res, rows); return;
  }
  sendError(res, "Forbidden", 403);
}

export async function acceptBid(req: AuthRequest, res: Response) {
  const bidId = parseInt(String(req.params.bidId || req.body.bidId));
  if (isNaN(bidId)) { sendError(res, "Invalid bid ID", 400); return; }

  await expireTimedOutJobs();
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT b.*, j.homeowner_id, j.status AS job_status, j.title AS job_title, u_owner.name AS owner_name
    FROM bids b JOIN jobs j ON j.id = b.job_id JOIN users u_owner ON u_owner.id = j.homeowner_id
    WHERE b.id = ${bidId}
  `;
  const b = rows[0];
  if (!b) { sendError(res, "Bid not found", 404); return; }
  if (Number(b.homeowner_id) !== req.user!.uid) { sendError(res, "Only the homeowner can accept a bid", 403); return; }
  if (b.job_status !== "open") { sendError(res, "Job is not open", 400); return; }

  await prisma.job.update({ where: { id: Number(b.job_id) }, data: { status: "in_progress", acceptedBidId: bidId } });
  await prisma.bid.update({ where: { id: bidId }, data: { status: "accepted" } });

  const rejected = await prisma.$queryRaw<{ provider_id: number }[]>`
    UPDATE bids SET status = 'rejected' WHERE job_id = ${b.job_id} AND id <> ${bidId} RETURNING provider_id
  `;

  await prisma.payment.upsert({
    where: { jobId: Number(b.job_id) },
    update: {},
    create: { jobId: Number(b.job_id), amount: Number(b.total), status: "pending" },
  });

  await prisma.notification.create({
    data: {
      userId: Number(b.provider_id),
      title: "Bid Accepted 🎉",
      body: `Congratulations! Your bid for '${b.job_title}' has been accepted by ${b.owner_name}.`,
      link: `/jobs/${b.job_id}`,
    },
  });
  for (const r of rejected) {
    await prisma.notification.create({
      data: {
        userId: r.provider_id,
        title: "Bid Not Selected",
        body: `Your bid for '${b.job_title}' was not selected.`,
        link: `/jobs/${b.job_id}`,
      },
    });
  }
  sendSuccess(res, { ok: true });
}

export async function declineBid(req: AuthRequest, res: Response) {
  const bidId = parseInt(String(req.params.bidId || req.body.bidId));
  if (isNaN(bidId)) { sendError(res, "Invalid bid ID", 400); return; }

  await expireTimedOutJobs();
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT b.*, j.homeowner_id, j.status AS job_status, j.title AS job_title, u_owner.name AS owner_name
    FROM bids b JOIN jobs j ON j.id = b.job_id JOIN users u_owner ON u_owner.id = j.homeowner_id
    WHERE b.id = ${bidId}
  `;
  const b = rows[0];
  if (!b) { sendError(res, "Bid not found", 404); return; }
  if (Number(b.homeowner_id) !== req.user!.uid) { sendError(res, "Only the homeowner can decline a bid", 403); return; }
  if (b.job_status !== "open") { sendError(res, "Job is not open", 400); return; }

  await prisma.bid.update({ where: { id: bidId }, data: { status: "rejected" } });
  await prisma.notification.create({
    data: {
      userId: Number(b.provider_id),
      title: "Bid Not Selected",
      body: `Your bid for '${b.job_title}' was not selected by ${b.owner_name}.`,
      link: `/jobs/${b.job_id}`,
    },
  });
  sendSuccess(res, { ok: true });
}
