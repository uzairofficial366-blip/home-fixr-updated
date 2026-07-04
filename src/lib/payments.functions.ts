import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ensureSchema, getSql } from "./db.server";
import { requireSession } from "./auth.server";

export const getPayment = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ jobId: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`SELECT * FROM payments WHERE job_id = ${data.jobId}`;
    return (rows[0] as any) ?? null;
  });

export const holdPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ jobId: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    const s = await requireSession();
    await ensureSchema();
    const sql = getSql();
    const jrows = await sql`SELECT homeowner_id FROM jobs WHERE id = ${data.jobId}`;
    const j = jrows[0] as { homeowner_id: number } | undefined;
    if (!j || j.homeowner_id !== s.uid) throw new Error("Forbidden");
    await sql`UPDATE payments SET status = 'held', updated_at = NOW() WHERE job_id = ${data.jobId} AND status = 'pending'`;
    return { ok: true };
  });

export const releasePayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ jobId: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    const s = await requireSession();
    await ensureSchema();
    const sql = getSql();
    const jrows = await sql`SELECT homeowner_id FROM jobs WHERE id = ${data.jobId}`;
    const j = jrows[0] as { homeowner_id: number } | undefined;
    if (!j || j.homeowner_id !== s.uid) throw new Error("Forbidden");
    await sql`UPDATE payments SET status = 'released', updated_at = NOW() WHERE job_id = ${data.jobId} AND status = 'held'`;
    return { ok: true };
  });
