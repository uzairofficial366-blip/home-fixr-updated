import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ensureSchema, expireTimedOutJobs, getSql } from "./db.server";
import { requireSession } from "./auth.server";
import { groqJson } from "./groq.server";

export const CATEGORIES = [
  "Plumbing",
  "Electrical",
  "Gardening",
  "Carpenter",
  "Painter",
  "Cleaning",
  "AC Technician",
  "Mason",
  "Home Maintenance",
  "Appliance Repair",
  "Pest Control",
  "Other Services",
] as const;

const ALLOWED_JOB_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_JOB_PHOTO_BYTES = 2 * 1024 * 1024;

const JobPhoto = z.object({
  fileName: z.string().min(1).max(200),
  mimeType: z.string().min(1).max(100),
  fileContentBase64: z.string().min(1).max(3_000_000),
});

const CreateJob = z.object({
  category: z.enum(CATEGORIES),
  title: z.string().min(3).max(160),
  description: z.string().min(10).max(2000),
  address: z.string().min(3).max(300),
  preferredDate: z.string().min(1).max(40),
  preferredTime: z.string().min(1).max(40),
  estimatedHours: z.number().min(0).max(999).optional(),
  estimatedDays: z.number().min(0).max(999).optional(),
  photos: z.array(JobPhoto).max(4).optional(),
  additionalNotes: z.string().max(1000).optional(),
  budget: z.number().positive().max(1_000_000).optional(),
});

async function broadcastJobToEligibleProviders({
  jobId,
  category,
  title,
}: {
  jobId: number;
  category: (typeof CATEGORIES)[number];
  title: string;
}) {
  const sql = getSql();
  const rows = await sql`
    INSERT INTO job_broadcasts (job_id, provider_id)
    SELECT ${jobId}, pp.user_id
    FROM provider_profiles pp
    JOIN users u ON u.id = pp.user_id
    WHERE u.role = 'provider'
      AND pp.is_available = true
      AND pp.verification_status = 'verified'
      AND ${category} = ANY(pp.categories)
    ON CONFLICT (job_id, provider_id) DO NOTHING
    RETURNING provider_id
  `;
  if (rows.length > 0) {
    await sql`
      INSERT INTO notifications (user_id, title, body, link)
      SELECT
        provider_id,
        'New matching job request',
        ${"A new " + category + " job is available: " + title},
        ${"/jobs/" + jobId}
      FROM job_broadcasts
      WHERE job_id = ${jobId}
    `;
  }
  return rows.length;
}

function getSuggestedBudget(job: {
  budget: number | string | null;
  ai_suggested_min: number | string | null;
  ai_suggested_max: number | string | null;
}) {
  const budget = Number(job.budget || 0);
  if (budget > 0) return Math.round(budget);
  const min = Number(job.ai_suggested_min || 0);
  const max = Number(job.ai_suggested_max || 0);
  if (min > 0 && max > 0) return Math.round((min + max) / 2);
  if (max > 0) return Math.round(max);
  if (min > 0) return Math.round(min);
  return 0;
}

function getEstimatedHours(job: {
  estimated_hours: number | string | null;
  estimated_days: number | string | null;
}) {
  const hours = Number(job.estimated_hours || 0);
  if (hours > 0) return hours;
  const days = Number(job.estimated_days || 0);
  if (days > 0) return days * 8;
  return 1;
}

export const suggestPrice = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        category: z.enum(CATEGORIES),
        title: z.string().min(3).max(200),
        description: z.string().min(5).max(2000),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const result = await groqJson<{ min: number; max: number; reasoning: string }>(
        "You are a pricing expert for home service jobs in Pakistan (currency: PKR). Estimate a fair total price range for the job based on category, scope, and typical labour + equipment costs.",
        `Category: ${data.category}\nTitle: ${data.title}\nDescription: ${data.description}\n\nRespond with JSON: {"min": number (PKR), "max": number (PKR), "reasoning": string (1-2 sentences)}`,
      );
      return {
        min: Math.max(0, Math.round(Number(result.min) || 0)),
        max: Math.max(0, Math.round(Number(result.max) || 0)),
        reasoning: String(result.reasoning || ""),
      };
    } catch (e) {
      return { min: 0, max: 0, reasoning: `AI unavailable: ${(e as Error).message}` };
    }
  });

export const createJob = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CreateJob.parse(d))
  .handler(async ({ data }) => {
    const s = await requireSession();
    if (s.role !== "homeowner") throw new Error("Only homeowners can post jobs");
    await ensureSchema();
    const sql = getSql();

    const photos =
      data.photos?.map((photo) => {
        if (!ALLOWED_JOB_PHOTO_TYPES.has(photo.mimeType)) {
          throw new Error("Only JPG, PNG, or WebP job photos are allowed.");
        }
        const base64Data = photo.fileContentBase64.includes(",")
          ? photo.fileContentBase64.split(",")[1]
          : photo.fileContentBase64;
        const sizeBytes = Math.round((base64Data.length * 3) / 4);
        if (sizeBytes === 0) throw new Error(`${photo.fileName} is empty.`);
        if (sizeBytes > MAX_JOB_PHOTO_BYTES) {
          throw new Error(`${photo.fileName} must be under 2MB.`);
        }
        const fileUrl = photo.fileContentBase64.startsWith("data:")
          ? photo.fileContentBase64
          : `data:${photo.mimeType};base64,${base64Data}`;
        return { ...photo, fileUrl, sizeBytes };
      }) ?? [];

    let aiMin: number | null = null;
    let aiMax: number | null = null;
    let aiReasoning: string | null = null;
    try {
      const ai = await groqJson<{ min: number; max: number; reasoning: string }>(
        "You are a pricing expert for home service jobs in Pakistan (PKR). Estimate a fair total price range.",
        `Category: ${data.category}\nTitle: ${data.title}\nDescription: ${data.description}\nRespond JSON: {"min":number,"max":number,"reasoning":string}`,
      );
      aiMin = Math.round(Number(ai.min) || 0);
      aiMax = Math.round(Number(ai.max) || 0);
      aiReasoning = String(ai.reasoning || "");
    } catch {
      /* skip AI on failure */
    }

    const rows = await sql`
      INSERT INTO jobs (
        homeowner_id,
        category,
        title,
        description,
        address,
        preferred_date,
        preferred_time,
        estimated_hours,
        estimated_days,
        additional_notes,
        budget,
        ai_suggested_min,
        ai_suggested_max,
        ai_reasoning
      )
      VALUES (
        ${s.uid},
        ${data.category},
        ${data.title},
        ${data.description},
        ${data.address},
        ${data.preferredDate},
        ${data.preferredTime},
        ${data.estimatedHours ?? null},
        ${data.estimatedDays ?? null},
        ${data.additionalNotes ?? ""},
        ${data.budget ?? null},
        ${aiMin},
        ${aiMax},
        ${aiReasoning}
      )
      RETURNING id
    `;
    const id = (rows[0] as { id: number }).id;

    for (const photo of photos) {
      await sql`
        INSERT INTO job_photos (job_id, original_name, mime_type, file_url, size_bytes)
        VALUES (${id}, ${photo.fileName}, ${photo.mimeType}, ${photo.fileUrl}, ${photo.sizeBytes})
      `;
    }

    const broadcastCount = await broadcastJobToEligibleProviders({
      jobId: id,
      category: data.category,
      title: data.title,
    });

    return { id, broadcastCount };
  });

export const listMyJobs = createServerFn({ method: "GET" }).handler(async () => {
  const s = await requireSession();
  await ensureSchema();
  await expireTimedOutJobs();
  const sql = getSql();
  const rows = await sql`
    SELECT j.*, (SELECT COUNT(*)::int FROM bids b WHERE b.job_id = j.id) AS bid_count
    FROM jobs j WHERE homeowner_id = ${s.uid} ORDER BY created_at DESC
  `;
  return rows;
});

export const listOpenJobs = createServerFn({ method: "GET" }).handler(async () => {
  const s = await requireSession();
  if (s.role !== "provider") throw new Error("Providers only");
  await ensureSchema();
  await expireTimedOutJobs();
  const sql = getSql();
  const rows = await sql`
    SELECT j.*, u.name AS homeowner_name,
      (SELECT COUNT(*)::int FROM bids b WHERE b.job_id = j.id) AS bid_count,
      EXISTS(SELECT 1 FROM bids b WHERE b.job_id = j.id AND b.provider_id = ${s.uid}) AS already_bid
    FROM jobs j
    JOIN users u ON u.id = j.homeowner_id
    JOIN provider_profiles pp ON pp.user_id = ${s.uid}
    WHERE j.status = 'open'
      AND pp.is_available = true
      AND pp.verification_status = 'verified'
      AND j.category = ANY(pp.categories)
      AND NOT EXISTS (
        SELECT 1 FROM job_broadcasts jb
        WHERE jb.job_id = j.id AND jb.provider_id = ${s.uid} AND jb.status = 'rejected'
      )
    ORDER BY j.created_at DESC LIMIT 100
  `;
  return rows;
});

export const getPendingJobBroadcast = createServerFn({ method: "GET" }).handler(async () => {
  const s = await requireSession();
  if (s.role !== "provider") throw new Error("Providers only");
  await ensureSchema();
  await expireTimedOutJobs();
  const sql = getSql();
  const rows = await sql`
    SELECT
      jb.id AS broadcast_id,
      j.id,
      j.title,
      j.category,
      j.description,
      j.address,
      j.estimated_hours,
      j.estimated_days,
      j.budget,
      j.ai_suggested_min,
      j.ai_suggested_max,
      u.name AS customer_name
    FROM job_broadcasts jb
    JOIN jobs j ON j.id = jb.job_id
    JOIN users u ON u.id = j.homeowner_id
    JOIN provider_profiles pp ON pp.user_id = jb.provider_id
    WHERE jb.provider_id = ${s.uid}
      AND jb.status = 'pending'
      AND j.status = 'open'
      AND pp.is_available = true
      AND pp.verification_status = 'verified'
      AND j.category = ANY(pp.categories)
      AND NOT EXISTS (
        SELECT 1 FROM bids b WHERE b.job_id = j.id AND b.provider_id = ${s.uid}
      )
    ORDER BY jb.created_at ASC
    LIMIT 1
  `;
  const job = rows[0] as
    | {
        broadcast_id: number;
        id: number;
        title: string;
        category: string;
        description: string;
        address: string;
        estimated_hours: number | string | null;
        estimated_days: number | string | null;
        budget: number | string | null;
        ai_suggested_min: number | string | null;
        ai_suggested_max: number | string | null;
        customer_name: string;
      }
    | undefined;
  if (!job) return null;
  return {
    ...job,
    suggested_budget: getSuggestedBudget(job),
    estimated_total_hours: getEstimatedHours(job),
  };
});

const BroadcastResponse = z.object({
  broadcastId: z.number().int().positive(),
});

const BroadcastCustomResponse = BroadcastResponse.extend({
  total: z.number().positive().max(10_000_000),
  message: z.string().max(1000).optional(),
});

async function getPendingBroadcastForProvider(broadcastId: number, providerId: number) {
  const sql = getSql();
  const rows = await sql`
    SELECT
      jb.id AS broadcast_id,
      j.id AS job_id,
      j.homeowner_id,
      j.title,
      j.category,
      j.status AS job_status,
      j.estimated_hours,
      j.estimated_days,
      j.budget,
      j.ai_suggested_min,
      j.ai_suggested_max,
      pp.hourly_rate
    FROM job_broadcasts jb
    JOIN jobs j ON j.id = jb.job_id
    JOIN provider_profiles pp ON pp.user_id = jb.provider_id
    WHERE jb.id = ${broadcastId}
      AND jb.provider_id = ${providerId}
      AND jb.status = 'pending'
      AND pp.is_available = true
      AND pp.verification_status = 'verified'
      AND j.category = ANY(pp.categories)
  `;
  return rows[0] as
    | {
        broadcast_id: number;
        job_id: number;
        homeowner_id: number;
        title: string;
        category: string;
        job_status: string;
        estimated_hours: number | string | null;
        estimated_days: number | string | null;
        budget: number | string | null;
        ai_suggested_min: number | string | null;
        ai_suggested_max: number | string | null;
        hourly_rate: number | string | null;
      }
    | undefined;
}

async function submitBroadcastBid({
  broadcastId,
  providerId,
  total,
  message,
  responseStatus,
}: {
  broadcastId: number;
  providerId: number;
  total: number;
  message: string;
  responseStatus: "accepted" | "customized";
}) {
  const sql = getSql();
  const broadcast = await getPendingBroadcastForProvider(broadcastId, providerId);
  if (!broadcast) throw new Error("Job request is no longer available.");
  if (broadcast.job_status !== "open") throw new Error("Job is not accepting bids.");

  const hoursEstimate = getEstimatedHours(broadcast);
  const hourlyRate = Math.max(1, Math.round((total / hoursEstimate) * 100) / 100);
  const originalBudget = getSuggestedBudget(broadcast);
  await sql`
    INSERT INTO bids (job_id, provider_id, hourly_rate, hours_estimate, equipment_cost, total, message)
    VALUES (${broadcast.job_id}, ${providerId}, ${hourlyRate}, ${hoursEstimate}, 0, ${total}, ${message})
    ON CONFLICT (job_id, provider_id) DO UPDATE SET
      hourly_rate = EXCLUDED.hourly_rate,
      hours_estimate = EXCLUDED.hours_estimate,
      equipment_cost = EXCLUDED.equipment_cost,
      total = EXCLUDED.total,
      message = EXCLUDED.message
  `;
  await sql`
    UPDATE job_broadcasts
    SET status = ${responseStatus}, responded_at = NOW()
    WHERE id = ${broadcastId} AND provider_id = ${providerId}
  `;
  await sql`
    INSERT INTO notifications (user_id, title, body, link)
    VALUES (
      ${broadcast.homeowner_id},
      ${responseStatus === "customized" ? "Provider counter-offer received" : "Provider accepted your suggested price"},
      ${
        "Original Budget: " +
        (originalBudget > 0 ? "PKR " + originalBudget.toLocaleString() : "Not specified") +
        ". Provider's Offered Price: PKR " +
        total.toLocaleString() +
        (message ? ". Note: " + message : "")
      },
      ${"/jobs/" + broadcast.job_id}
    )
  `;
  return { ok: true, jobId: broadcast.job_id };
}

export const acceptJobBroadcast = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => BroadcastResponse.parse(d))
  .handler(async ({ data }) => {
    const s = await requireSession();
    if (s.role !== "provider") throw new Error("Providers only");
    await ensureSchema();
    await expireTimedOutJobs();
    const broadcast = await getPendingBroadcastForProvider(data.broadcastId, s.uid);
    if (!broadcast) throw new Error("Job request is no longer available.");
    const suggestedTotal = getSuggestedBudget(broadcast);
    const fallbackTotal =
      Math.max(1, Number(broadcast.hourly_rate || 0)) * getEstimatedHours(broadcast);
    return submitBroadcastBid({
      broadcastId: data.broadcastId,
      providerId: s.uid,
      total: suggestedTotal > 0 ? suggestedTotal : fallbackTotal,
      message: "Accepted the suggested job request.",
      responseStatus: "accepted",
    });
  });

export const customizeJobBroadcastPrice = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => BroadcastCustomResponse.parse(d))
  .handler(async ({ data }) => {
    const s = await requireSession();
    if (s.role !== "provider") throw new Error("Providers only");
    await ensureSchema();
    await expireTimedOutJobs();
    return submitBroadcastBid({
      broadcastId: data.broadcastId,
      providerId: s.uid,
      total: data.total,
      message: data.message ?? "Submitted a counter-offer for the job request.",
      responseStatus: "customized",
    });
  });

export const rejectJobBroadcast = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => BroadcastResponse.parse(d))
  .handler(async ({ data }) => {
    const s = await requireSession();
    if (s.role !== "provider") throw new Error("Providers only");
    await ensureSchema();
    await expireTimedOutJobs();
    const sql = getSql();
    await sql`
      UPDATE job_broadcasts
      SET status = 'rejected', responded_at = NOW()
      WHERE id = ${data.broadcastId} AND provider_id = ${s.uid} AND status = 'pending'
    `;
    return { ok: true };
  });

export const getJob = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    const s = await requireSession();
    await ensureSchema();
    await expireTimedOutJobs();
    const sql = getSql();
    const rows = await sql`
      SELECT j.*, u.name AS homeowner_name, u.email AS homeowner_email
      FROM jobs j JOIN users u ON u.id = j.homeowner_id WHERE j.id = ${data.id}
    `;
    const job = rows[0] as Record<string, unknown> | undefined;
    if (!job) throw new Error("Job not found");
    // Only homeowner or providers who bid (or open browsable) can view
    const canView =
      Number(job.homeowner_id) === s.uid || s.role === "provider" || s.role === "admin";
    if (!canView) throw new Error("Forbidden");
    const photos = await sql`
      SELECT id, original_name, mime_type, file_url, size_bytes
      FROM job_photos
      WHERE job_id = ${data.id}
      ORDER BY uploaded_at ASC
    `;
    return { ...job, photos };
  });

export const requestJobCompletion = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ jobId: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    const s = await requireSession();
    await ensureSchema();
    await expireTimedOutJobs();
    const sql = getSql();
    if (s.role !== "provider") throw new Error("Only the provider can mark work as completed");
    const rows = await sql`
      SELECT
        j.homeowner_id,
        j.status,
        j.title,
        j.completion_requested_at,
        b.provider_id
      FROM jobs j
      JOIN bids b ON b.id = j.accepted_bid_id
      WHERE j.id = ${data.jobId}
    `;
    const j = rows[0] as
      | {
          homeowner_id: number;
          status: string;
          title: string;
          completion_requested_at: string | null;
          provider_id: number;
        }
      | undefined;
    if (!j) throw new Error("Job not found");
    if (j.provider_id !== s.uid) throw new Error("Only the accepted provider can mark this job");
    if (j.status !== "in_progress") throw new Error("Job is not in progress");
    if (j.completion_requested_at) return { ok: true };

    await sql`
      UPDATE jobs
      SET completion_requested_at = NOW()
      WHERE id = ${data.jobId}
    `;
    await sql`
      INSERT INTO notifications (user_id, title, body, link)
      VALUES (
        ${j.homeowner_id},
        'Job completion requested',
        ${"Your provider marked '" + j.title + "' as completed. Please confirm completion."},
        ${"/jobs/" + data.jobId}
      )
    `;
    return { ok: true };
  });

export const confirmJobCompletion = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ jobId: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    const s = await requireSession();
    await ensureSchema();
    await expireTimedOutJobs();
    const sql = getSql();
    const rows = await sql`
      SELECT j.homeowner_id, j.status, j.title, j.completion_requested_at, b.provider_id
      FROM jobs j
      LEFT JOIN bids b ON b.id = j.accepted_bid_id
      WHERE j.id = ${data.jobId}
    `;
    const j = rows[0] as
      | {
          homeowner_id: number;
          status: string;
          title: string;
          completion_requested_at: string | null;
          provider_id: number | null;
        }
      | undefined;
    if (!j) throw new Error("Job not found");
    if (j.homeowner_id !== s.uid) throw new Error("Only the homeowner can confirm completion");
    if (j.status !== "in_progress") throw new Error("Job is not in progress");
    if (!j.completion_requested_at) {
      throw new Error("The provider has not requested completion yet");
    }

    await sql`
      UPDATE jobs
      SET status = 'completed', completed_at = NOW()
      WHERE id = ${data.jobId}
    `;
    await sql`
      UPDATE payments
      SET status = 'released', updated_at = NOW()
      WHERE job_id = ${data.jobId} AND status = 'held'
    `;
    if (j.provider_id) {
      await sql`
        INSERT INTO notifications (user_id, title, body, link)
        VALUES (
          ${j.provider_id},
          'Job completed',
          ${"The customer confirmed completion for '" + j.title + "'."},
          ${"/jobs/" + data.jobId}
        )
      `;
    }
    return { ok: true };
  });

export const completeJob = confirmJobCompletion;
