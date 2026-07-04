import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ensureSchema, expireTimedOutJobs, getSql } from "./db.server";
import { requireSession } from "./auth.server";

const CreateBid = z.object({
  jobId: z.number().int().positive(),
  hourlyRate: z.number().positive().max(1_000_000),
  hoursEstimate: z.number().positive().max(1000),
  equipmentCost: z.number().min(0).max(10_000_000),
  message: z.string().max(1000).optional(),
});

export const createBid = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CreateBid.parse(d))
  .handler(async ({ data }) => {
    const s = await requireSession();
    if (s.role !== "provider") throw new Error("Only providers can bid");
    await ensureSchema();
    await expireTimedOutJobs();
    const sql = getSql();
    const jrows =
      await sql`SELECT status, category, homeowner_id, title, budget FROM jobs WHERE id = ${data.jobId}`;
    const job = jrows[0] as
      | {
          status: string;
          category: string;
          homeowner_id: number;
          title: string;
          budget: number | string | null;
        }
      | undefined;
    if (!job) throw new Error("Job not found");
    if (job.status !== "open") throw new Error("Job is not accepting bids");
    const eligibleRows = await sql`
      SELECT 1
      FROM provider_profiles
      WHERE user_id = ${s.uid}
        AND is_available = true
        AND verification_status = 'verified'
        AND ${job.category} = ANY(categories)
      LIMIT 1
    `;
    if (eligibleRows.length === 0) {
      throw new Error("This job is only available to verified providers who offer this service.");
    }
    const total = data.hourlyRate * data.hoursEstimate + data.equipmentCost;
    const rows = await sql`
      INSERT INTO bids (job_id, provider_id, hourly_rate, hours_estimate, equipment_cost, total, message)
      VALUES (${data.jobId}, ${s.uid}, ${data.hourlyRate}, ${data.hoursEstimate}, ${data.equipmentCost}, ${total}, ${data.message ?? ""})
      ON CONFLICT (job_id, provider_id) DO UPDATE SET
        hourly_rate = EXCLUDED.hourly_rate,
        hours_estimate = EXCLUDED.hours_estimate,
        equipment_cost = EXCLUDED.equipment_cost,
        total = EXCLUDED.total,
        message = EXCLUDED.message
      RETURNING id, total
    `;
    await sql`
      INSERT INTO notifications (user_id, title, body, link)
      VALUES (
        ${job.homeowner_id},
        'Provider offer received',
        ${
          "Original Budget: " +
          (Number(job.budget || 0) > 0
            ? "PKR " + Number(job.budget).toLocaleString()
            : "Not specified") +
          ". Provider's Offered Price: PKR " +
          total.toLocaleString() +
          (data.message ? ". Note: " + data.message : "")
        },
        ${"/jobs/" + data.jobId}
      )
    `;
    return rows[0] as { id: number; total: number };
  });

export const listBidsForJob = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ jobId: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    const s = await requireSession();
    await ensureSchema();
    await expireTimedOutJobs();
    const sql = getSql();
    const jrows =
      await sql`SELECT homeowner_id, accepted_bid_id FROM jobs WHERE id = ${data.jobId}`;
    const job = jrows[0] as { homeowner_id: number; accepted_bid_id: number | null } | undefined;
    if (!job) throw new Error("Job not found");

    if (job.homeowner_id === s.uid || s.role === "admin") {
      const rows = await sql`
        SELECT b.*, u.name AS provider_name, u.email AS provider_email,
          pp.verification_status,
          COALESCE((SELECT AVG(rating)::float FROM reviews r WHERE r.provider_id = b.provider_id), 0) AS avg_rating,
          (SELECT COUNT(*)::int FROM reviews r WHERE r.provider_id = b.provider_id) AS review_count
        FROM bids b
        JOIN users u ON u.id = b.provider_id
        LEFT JOIN provider_profiles pp ON pp.user_id = b.provider_id
        WHERE b.job_id = ${data.jobId}
        ORDER BY b.total ASC
      `;
      return rows;
    }
    if (s.role === "provider") {
      const rows = await sql`
        SELECT b.*, u.name AS provider_name FROM bids b JOIN users u ON u.id = b.provider_id
        WHERE b.job_id = ${data.jobId} AND b.provider_id = ${s.uid}
      `;
      return rows;
    }
    throw new Error("Forbidden");
  });

export const acceptBid = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ bidId: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    const s = await requireSession();
    await ensureSchema();
    await expireTimedOutJobs();
    const sql = getSql();
    const brows = await sql`
      SELECT b.*, j.homeowner_id, j.status AS job_status, j.title AS job_title,
        u_owner.name AS owner_name
      FROM bids b
      JOIN jobs j ON j.id = b.job_id
      JOIN users u_owner ON u_owner.id = j.homeowner_id
      WHERE b.id = ${data.bidId}
    `;
    const b = brows[0] as
      | {
          id: number;
          job_id: number;
          provider_id: number;
          total: number;
          homeowner_id: number;
          job_status: string;
          job_title: string;
          owner_name: string;
        }
      | undefined;
    if (!b) throw new Error("Bid not found");
    if (b.homeowner_id !== s.uid) throw new Error("Only the homeowner can accept a bid");
    if (b.job_status !== "open") throw new Error("Job is not open");

    await sql`UPDATE jobs SET status = 'in_progress', accepted_bid_id = ${b.id} WHERE id = ${b.job_id}`;
    await sql`UPDATE bids SET status = 'accepted' WHERE id = ${b.id}`;
    // Reject all other bids and notify those providers
    const rejectedRows = await sql`
      UPDATE bids SET status = 'rejected' WHERE job_id = ${b.job_id} AND id <> ${b.id}
      RETURNING provider_id
    `;
    await sql`INSERT INTO payments (job_id, amount, status) VALUES (${b.job_id}, ${b.total}, 'pending') ON CONFLICT (job_id) DO NOTHING`;

    // Notify accepted provider
    await sql`
      INSERT INTO notifications (user_id, title, body, link)
      VALUES (
        ${b.provider_id},
        'Bid Accepted 🎉',
        ${"Congratulations! Your bid for '" + b.job_title + "' has been accepted by " + b.owner_name + "."},
        ${"/jobs/" + b.job_id}
      )
    `;
    // Notify rejected providers
    for (const row of rejectedRows as Array<{ provider_id: number }>) {
      await sql`
        INSERT INTO notifications (user_id, title, body, link)
        VALUES (
          ${row.provider_id},
          'Bid Not Selected',
          ${"Your bid for '" + b.job_title + "' was not selected."},
          ${"/jobs/" + b.job_id}
        )
      `;
    }

    return { ok: true };
  });

export const declineBid = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ bidId: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    const s = await requireSession();
    await ensureSchema();
    await expireTimedOutJobs();
    const sql = getSql();
    const brows = await sql`
      SELECT b.*, j.homeowner_id, j.status AS job_status, j.title AS job_title,
        u_owner.name AS owner_name
      FROM bids b
      JOIN jobs j ON j.id = b.job_id
      JOIN users u_owner ON u_owner.id = j.homeowner_id
      WHERE b.id = ${data.bidId}
    `;
    const b = brows[0] as
      | {
          id: number;
          job_id: number;
          provider_id: number;
          homeowner_id: number;
          job_status: string;
          job_title: string;
          owner_name: string;
        }
      | undefined;
    if (!b) throw new Error("Bid not found");
    if (b.homeowner_id !== s.uid) throw new Error("Only the homeowner can decline a bid");
    if (b.job_status !== "open") throw new Error("Job is not open");

    await sql`UPDATE bids SET status = 'rejected' WHERE id = ${b.id}`;

    // Notify the declined provider
    await sql`
      INSERT INTO notifications (user_id, title, body, link)
      VALUES (
        ${b.provider_id},
        'Bid Not Selected',
        ${"Your bid for '" + b.job_title + "' was not selected by " + b.owner_name + "."},
        ${"/jobs/" + b.job_id}
      )
    `;

    return { ok: true };
  });
