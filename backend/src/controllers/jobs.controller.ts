import { Response } from "express";
import { prisma } from "../database/prisma.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { groqJson } from "../services/groq.service.js";
import {
  CreateJobSchema,
  SuggestPriceSchema,
  BroadcastResponseSchema,
  BroadcastCustomResponseSchema,
  CATEGORIES,
} from "../validators/index.js";
import { AuthRequest } from "../middleware/authenticate.js";

const ALLOWED_JOB_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_JOB_PHOTO_BYTES = 2 * 1024 * 1024;

async function expireTimedOutJobs() {
  await prisma.$executeRaw`
    UPDATE jobs SET status = 'expired'
    WHERE status = 'open'
      AND created_at <= NOW() - INTERVAL '10 minutes'
      AND NOT EXISTS (SELECT 1 FROM bids WHERE job_id = jobs.id)
  `;
}

async function broadcastJobToEligibleProviders(jobId: number, category: string, title: string) {
  const providers = await prisma.$queryRaw<{ user_id: number }[]>`
    SELECT pp.user_id FROM provider_profiles pp
    JOIN users u ON u.id = pp.user_id
    WHERE u.role = 'provider'
      AND pp.is_available = true
      AND pp.verification_status = 'verified'
      AND ${category} = ANY(pp.categories)
  `;

  if (providers.length === 0) return 0;

  for (const p of providers) {
    await prisma.jobBroadcast.upsert({
      where: { jobId_providerId: { jobId, providerId: p.user_id } },
      update: {},
      create: { jobId, providerId: p.user_id },
    });
    await prisma.notification.create({
      data: {
        userId: p.user_id,
        title: "New matching job request",
        body: `A new ${category} job is available: ${title}`,
        link: `/jobs/${jobId}`,
      },
    });
  }
  return providers.length;
}

function getSuggestedBudget(job: {
  budget?: number | null;
  aiSuggestedMin?: number | null;
  aiSuggestedMax?: number | null;
}) {
  const budget = Number(job.budget || 0);
  if (budget > 0) return Math.round(budget);
  const min = Number(job.aiSuggestedMin || 0);
  const max = Number(job.aiSuggestedMax || 0);
  if (min > 0 && max > 0) return Math.round((min + max) / 2);
  if (max > 0) return Math.round(max);
  if (min > 0) return Math.round(min);
  return 0;
}

function getEstimatedHours(job: {
  estimatedHours?: number | null;
  estimatedDays?: number | null;
}) {
  const hours = Number(job.estimatedHours || 0);
  if (hours > 0) return hours;
  const days = Number(job.estimatedDays || 0);
  if (days > 0) return days * 8;
  return 1;
}

export async function suggestPrice(req: AuthRequest, res: Response) {
  const parse = SuggestPriceSchema.safeParse(req.body);
  if (!parse.success) { sendError(res, parse.error.issues[0]?.message || "Validation error", 422); return; }
  try {
    const result = await groqJson<{ min: number; max: number; reasoning: string }>(
      "You are a pricing expert for home service jobs in Pakistan (currency: PKR). Estimate a fair total price range.",
      `Category: ${parse.data.category}\nTitle: ${parse.data.title}\nDescription: ${parse.data.description}\n\nRespond with JSON: {"min": number (PKR), "max": number (PKR), "reasoning": string (1-2 sentences)}`
    );
    sendSuccess(res, {
      min: Math.max(0, Math.round(Number(result.min) || 0)),
      max: Math.max(0, Math.round(Number(result.max) || 0)),
      reasoning: String(result.reasoning || ""),
    });
  } catch (e) {
    sendSuccess(res, { min: 0, max: 0, reasoning: `AI unavailable: ${(e as Error).message}` });
  }
}

export async function createJob(req: AuthRequest, res: Response) {
  if (req.user!.role !== "homeowner") { sendError(res, "Only homeowners can post jobs", 403); return; }

  const parse = CreateJobSchema.safeParse(req.body);
  if (!parse.success) { sendError(res, parse.error.issues[0]?.message || "Validation error", 422); return; }
  const data = parse.data;

  const photos = (data.photos ?? []).map((photo) => {
    if (!ALLOWED_JOB_PHOTO_TYPES.has(photo.mimeType)) throw new Error("Only JPG, PNG, or WebP job photos are allowed.");
    const base64Data = photo.fileContentBase64.includes(",") ? photo.fileContentBase64.split(",")[1] : photo.fileContentBase64;
    const sizeBytes = Math.round((base64Data.length * 3) / 4);
    if (sizeBytes === 0) throw new Error(`${photo.fileName} is empty.`);
    if (sizeBytes > MAX_JOB_PHOTO_BYTES) throw new Error(`${photo.fileName} must be under 2MB.`);
    const fileUrl = photo.fileContentBase64.startsWith("data:") ? photo.fileContentBase64 : `data:${photo.mimeType};base64,${base64Data}`;
    return { ...photo, fileUrl, sizeBytes };
  });

  let aiMin: number | null = null, aiMax: number | null = null, aiReasoning: string | null = null;
  try {
    const ai = await groqJson<{ min: number; max: number; reasoning: string }>(
      "You are a pricing expert for home service jobs in Pakistan (PKR). Estimate a fair total price range.",
      `Category: ${data.category}\nTitle: ${data.title}\nDescription: ${data.description}\nRespond JSON: {"min":number,"max":number,"reasoning":string}`
    );
    aiMin = Math.round(Number(ai.min) || 0);
    aiMax = Math.round(Number(ai.max) || 0);
    aiReasoning = String(ai.reasoning || "");
  } catch { /* skip AI on failure */ }

  const job = await prisma.job.create({
    data: {
      homeownerId: req.user!.uid,
      category: data.category,
      title: data.title,
      description: data.description,
      address: data.address,
      preferredDate: data.preferredDate,
      preferredTime: data.preferredTime,
      estimatedHours: data.estimatedHours ?? null,
      estimatedDays: data.estimatedDays ?? null,
      additionalNotes: data.additionalNotes ?? "",
      budget: data.budget ?? null,
      aiSuggestedMin: aiMin,
      aiSuggestedMax: aiMax,
      aiReasoning,
    },
  });

  for (const photo of photos) {
    await prisma.jobPhoto.create({
      data: { jobId: job.id, originalName: photo.fileName, mimeType: photo.mimeType, fileUrl: photo.fileUrl, sizeBytes: photo.sizeBytes },
    });
  }

  const broadcastCount = await broadcastJobToEligibleProviders(job.id, data.category, data.title);
  sendSuccess(res, { id: job.id, broadcastCount }, 201);
}

export async function listMyJobs(req: AuthRequest, res: Response) {
  await expireTimedOutJobs();
  const jobs = await prisma.$queryRaw<unknown[]>`
    SELECT j.*, (SELECT COUNT(*)::int FROM bids b WHERE b.job_id = j.id) AS bid_count
    FROM jobs j WHERE homeowner_id = ${req.user!.uid} ORDER BY created_at DESC
  `;
  sendSuccess(res, jobs);
}

export async function listOpenJobs(req: AuthRequest, res: Response) {
  if (req.user!.role !== "provider") { sendError(res, "Providers only", 403); return; }
  await expireTimedOutJobs();
  const rows = await prisma.$queryRaw<unknown[]>`
    SELECT j.*, u.name AS homeowner_name,
      (SELECT COUNT(*)::int FROM bids b WHERE b.job_id = j.id) AS bid_count,
      EXISTS(SELECT 1 FROM bids b WHERE b.job_id = j.id AND b.provider_id = ${req.user!.uid}) AS already_bid
    FROM jobs j
    JOIN users u ON u.id = j.homeowner_id
    JOIN provider_profiles pp ON pp.user_id = ${req.user!.uid}
    WHERE j.status = 'open'
      AND pp.is_available = true
      AND pp.verification_status = 'verified'
      AND j.category = ANY(pp.categories)
      AND NOT EXISTS (
        SELECT 1 FROM job_broadcasts jb
        WHERE jb.job_id = j.id AND jb.provider_id = ${req.user!.uid} AND jb.status = 'rejected'
      )
    ORDER BY j.created_at DESC LIMIT 100
  `;
  sendSuccess(res, rows);
}

export async function getJob(req: AuthRequest, res: Response) {
  const id = parseInt(String(req.params.id || req.params.jobId || req.params.bidId));
  if (isNaN(id)) { sendError(res, "Invalid job ID", 400); return; }

  await expireTimedOutJobs();
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT j.*, u.name AS homeowner_name, u.email AS homeowner_email
    FROM jobs j JOIN users u ON u.id = j.homeowner_id WHERE j.id = ${id}
  `;
  const job = rows[0];
  if (!job) { sendError(res, "Job not found", 404); return; }

  const canView = Number(job.homeowner_id) === req.user!.uid || req.user!.role === "provider" || req.user!.role === "admin";
  if (!canView) { sendError(res, "Forbidden", 403); return; }

  const photos = await prisma.jobPhoto.findMany({
    where: { jobId: id },
    orderBy: { uploadedAt: "asc" },
    select: { id: true, originalName: true, mimeType: true, fileUrl: true, sizeBytes: true },
  });
  sendSuccess(res, { ...job, photos });
}

export async function getPendingJobBroadcast(req: AuthRequest, res: Response) {
  if (req.user!.role !== "provider") { sendError(res, "Providers only", 403); return; }
  await expireTimedOutJobs();

  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT
      jb.id AS broadcast_id,
      j.id, j.title, j.category, j.description, j.address,
      j.estimated_hours, j.estimated_days, j.budget,
      j.ai_suggested_min, j.ai_suggested_max,
      u.name AS customer_name
    FROM job_broadcasts jb
    JOIN jobs j ON j.id = jb.job_id
    JOIN users u ON u.id = j.homeowner_id
    JOIN provider_profiles pp ON pp.user_id = jb.provider_id
    WHERE jb.provider_id = ${req.user!.uid}
      AND jb.status = 'pending'
      AND j.status = 'open'
      AND pp.is_available = true
      AND pp.verification_status = 'verified'
      AND j.category = ANY(pp.categories)
      AND NOT EXISTS (SELECT 1 FROM bids b WHERE b.job_id = j.id AND b.provider_id = ${req.user!.uid})
    ORDER BY jb.created_at ASC LIMIT 1
  `;
  const job = rows[0];
  if (!job) { sendSuccess(res, null); return; }

  sendSuccess(res, {
    ...job,
    suggested_budget: getSuggestedBudget({
      budget: job.budget as number,
      aiSuggestedMin: job.ai_suggested_min as number,
      aiSuggestedMax: job.ai_suggested_max as number,
    }),
    estimated_total_hours: getEstimatedHours({
      estimatedHours: job.estimated_hours as number,
      estimatedDays: job.estimated_days as number,
    }),
  });
}

export async function acceptJobBroadcast(req: AuthRequest, res: Response) {
  if (req.user!.role !== "provider") { sendError(res, "Providers only", 403); return; }

  const parse = BroadcastResponseSchema.safeParse(req.body);
  if (!parse.success) { sendError(res, parse.error.issues[0]?.message || "Validation error", 422); return; }

  await expireTimedOutJobs();
  const broadcasts = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT jb.*, j.id AS job_id, j.homeowner_id, j.title, j.category, j.status AS job_status,
      j.estimated_hours, j.estimated_days, j.budget, j.ai_suggested_min, j.ai_suggested_max,
      pp.hourly_rate
    FROM job_broadcasts jb
    JOIN jobs j ON j.id = jb.job_id
    JOIN provider_profiles pp ON pp.user_id = jb.provider_id
    WHERE jb.id = ${parse.data.broadcastId} AND jb.provider_id = ${req.user!.uid}
      AND jb.status = 'pending' AND pp.is_available = true AND pp.verification_status = 'verified'
  `;
  const broadcast = broadcasts[0];
  if (!broadcast) { sendError(res, "Job request no longer available", 404); return; }
  if (broadcast.job_status !== "open") { sendError(res, "Job is not accepting bids", 400); return; }

  const suggestedTotal = getSuggestedBudget({ budget: broadcast.budget as number, aiSuggestedMin: broadcast.ai_suggested_min as number, aiSuggestedMax: broadcast.ai_suggested_max as number });
  const hours = getEstimatedHours({ estimatedHours: broadcast.estimated_hours as number, estimatedDays: broadcast.estimated_days as number });
  const fallbackTotal = Math.max(1, Number(broadcast.hourly_rate || 0)) * hours;
  const total = suggestedTotal > 0 ? suggestedTotal : fallbackTotal;
  const hourlyRate = Math.max(1, Math.round((total / hours) * 100) / 100);

  await prisma.bid.upsert({
    where: { jobId_providerId: { jobId: Number(broadcast.job_id), providerId: req.user!.uid } },
    update: { hourlyRate, hoursEstimate: hours, equipmentCost: 0, total, message: "Accepted the suggested job request." },
    create: { jobId: Number(broadcast.job_id), providerId: req.user!.uid, hourlyRate, hoursEstimate: hours, equipmentCost: 0, total, message: "Accepted the suggested job request." },
  });
  await prisma.jobBroadcast.update({ where: { id: parse.data.broadcastId }, data: { status: "accepted", respondedAt: new Date() } });
  await prisma.notification.create({
    data: {
      userId: Number(broadcast.homeowner_id),
      title: "Provider accepted your suggested price",
      body: `Provider's Offered Price: PKR ${total.toLocaleString()}`,
      link: `/jobs/${broadcast.job_id}`,
    },
  });
  sendSuccess(res, { ok: true, jobId: broadcast.job_id });
}

export async function customizeJobBroadcastPrice(req: AuthRequest, res: Response) {
  if (req.user!.role !== "provider") { sendError(res, "Providers only", 403); return; }

  const parse = BroadcastCustomResponseSchema.safeParse(req.body);
  if (!parse.success) { sendError(res, parse.error.issues[0]?.message || "Validation error", 422); return; }

  await expireTimedOutJobs();
  const broadcasts = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT jb.*, j.id AS job_id, j.homeowner_id, j.status AS job_status,
      j.estimated_hours, j.estimated_days, j.budget, j.ai_suggested_min, j.ai_suggested_max
    FROM job_broadcasts jb
    JOIN jobs j ON j.id = jb.job_id
    JOIN provider_profiles pp ON pp.user_id = jb.provider_id
    WHERE jb.id = ${parse.data.broadcastId} AND jb.provider_id = ${req.user!.uid}
      AND jb.status = 'pending' AND pp.is_available = true AND pp.verification_status = 'verified'
  `;
  const broadcast = broadcasts[0];
  if (!broadcast) { sendError(res, "Job request no longer available", 404); return; }
  if (broadcast.job_status !== "open") { sendError(res, "Job is not accepting bids", 400); return; }

  const hours = getEstimatedHours({ estimatedHours: broadcast.estimated_hours as number, estimatedDays: broadcast.estimated_days as number });
  const total = parse.data.total;
  const hourlyRate = Math.max(1, Math.round((total / hours) * 100) / 100);
  const originalBudget = getSuggestedBudget({ budget: broadcast.budget as number, aiSuggestedMin: broadcast.ai_suggested_min as number, aiSuggestedMax: broadcast.ai_suggested_max as number });

  await prisma.bid.upsert({
    where: { jobId_providerId: { jobId: Number(broadcast.job_id), providerId: req.user!.uid } },
    update: { hourlyRate, hoursEstimate: hours, equipmentCost: 0, total, message: parse.data.message ?? "Counter-offer submitted." },
    create: { jobId: Number(broadcast.job_id), providerId: req.user!.uid, hourlyRate, hoursEstimate: hours, equipmentCost: 0, total, message: parse.data.message ?? "Counter-offer submitted." },
  });
  await prisma.jobBroadcast.update({ where: { id: parse.data.broadcastId }, data: { status: "customized", respondedAt: new Date() } });
  await prisma.notification.create({
    data: {
      userId: Number(broadcast.homeowner_id),
      title: "Provider counter-offer received",
      body: `Original Budget: ${originalBudget > 0 ? "PKR " + originalBudget.toLocaleString() : "Not specified"}. Provider's Offered Price: PKR ${total.toLocaleString()}${parse.data.message ? ". Note: " + parse.data.message : ""}`,
      link: `/jobs/${broadcast.job_id}`,
    },
  });
  sendSuccess(res, { ok: true, jobId: broadcast.job_id });
}

export async function rejectJobBroadcast(req: AuthRequest, res: Response) {
  if (req.user!.role !== "provider") { sendError(res, "Providers only", 403); return; }

  const parse = BroadcastResponseSchema.safeParse(req.body);
  if (!parse.success) { sendError(res, parse.error.issues[0]?.message || "Validation error", 422); return; }

  await prisma.jobBroadcast.updateMany({
    where: { id: parse.data.broadcastId, providerId: req.user!.uid, status: "pending" },
    data: { status: "rejected", respondedAt: new Date() },
  });
  sendSuccess(res, { ok: true });
}

export async function requestJobCompletion(req: AuthRequest, res: Response) {
  if (req.user!.role !== "provider") { sendError(res, "Only the provider can mark work as completed", 403); return; }

  const jobId = parseInt(String(req.params.jobId || req.body.jobId));
  if (isNaN(jobId)) { sendError(res, "Invalid job ID", 400); return; }

  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT j.homeowner_id, j.status, j.title, j.completion_requested_at, b.provider_id
    FROM jobs j JOIN bids b ON b.id = j.accepted_bid_id WHERE j.id = ${jobId}
  `;
  const j = rows[0];
  if (!j) { sendError(res, "Job not found", 404); return; }
  if (Number(j.provider_id) !== req.user!.uid) { sendError(res, "Only the accepted provider can mark this job", 403); return; }
  if (j.status !== "in_progress") { sendError(res, "Job is not in progress", 400); return; }
  if (j.completion_requested_at) { sendSuccess(res, { ok: true }); return; }

  await prisma.job.update({ where: { id: jobId }, data: { completionRequestedAt: new Date() } });
  await prisma.notification.create({
    data: {
      userId: Number(j.homeowner_id),
      title: "Job completion requested",
      body: `Your provider marked '${j.title}' as completed. Please confirm completion.`,
      link: `/jobs/${jobId}`,
    },
  });
  sendSuccess(res, { ok: true });
}

export async function confirmJobCompletion(req: AuthRequest, res: Response) {
  const jobId = parseInt(String(req.params.jobId || req.body.jobId));
  if (isNaN(jobId)) { sendError(res, "Invalid job ID", 400); return; }

  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT j.homeowner_id, j.status, j.title, j.completion_requested_at, b.provider_id
    FROM jobs j LEFT JOIN bids b ON b.id = j.accepted_bid_id WHERE j.id = ${jobId}
  `;
  const j = rows[0];
  if (!j) { sendError(res, "Job not found", 404); return; }
  if (Number(j.homeowner_id) !== req.user!.uid) { sendError(res, "Only the homeowner can confirm completion", 403); return; }
  if (j.status !== "in_progress") { sendError(res, "Job is not in progress", 400); return; }
  if (!j.completion_requested_at) { sendError(res, "The provider has not requested completion yet", 400); return; }

  await prisma.job.update({ where: { id: jobId }, data: { status: "completed", completedAt: new Date() } });
  await prisma.payment.updateMany({ where: { jobId, status: "held" }, data: { status: "released", updatedAt: new Date() } });

  // Auto-create commission payment (20%) when payment is released
  if (j.provider_id) {
    const payment = await prisma.payment.findUnique({ where: { jobId } });
    if (payment) {
      const amountOwed = Number(payment.amount) * 0.20;
      await prisma.commissionPayment.upsert({
        where: { jobId },
        update: {},
        create: {
          jobId,
          providerId: Number(j.provider_id),
          amountOwed,
          status: "unpaid",
        },
      });
    }

    await prisma.notification.create({
      data: {
        userId: Number(j.provider_id),
        title: "Job completed",
        body: `The customer confirmed completion for '${j.title}'. A 20% platform commission is now owed — visit your Revenue tab to pay.`,
        link: `/provider`,
      },
    });
  }
  sendSuccess(res, { ok: true });
}
