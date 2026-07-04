import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ensureSchema, getSql } from "./db.server";
import { requireSession } from "./auth.server";

export const createReview = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        jobId: z.number().int().positive(),
        rating: z.number().int().min(1).max(5),
        comment: z.string().trim().min(1, "Written review is required").max(1000),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const s = await requireSession();
    await ensureSchema();
    const sql = getSql();
    const jrows =
      await sql`SELECT homeowner_id, accepted_bid_id, status FROM jobs WHERE id = ${data.jobId}`;
    const j = jrows[0] as
      { homeowner_id: number; accepted_bid_id: number | null; status: string } | undefined;
    if (!j) throw new Error("Job not found");
    if (j.homeowner_id !== s.uid) throw new Error("Only the homeowner can review");
    if (j.status !== "completed") throw new Error("Job must be completed first");
    if (!j.accepted_bid_id) throw new Error("No provider on this job");
    const brows = await sql`SELECT provider_id FROM bids WHERE id = ${j.accepted_bid_id}`;
    const providerId = (brows[0] as { provider_id: number }).provider_id;
    await sql`
      INSERT INTO reviews (job_id, reviewer_id, provider_id, rating, comment)
      VALUES (${data.jobId}, ${s.uid}, ${providerId}, ${data.rating}, ${data.comment})
      ON CONFLICT (job_id, reviewer_id) DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment
    `;
    return { ok: true };
  });

export const getJobReview = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ jobId: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`SELECT rating, comment FROM reviews WHERE job_id = ${data.jobId}`;
    return (rows[0] as { rating: number; comment: string } | undefined) ?? null;
  });
