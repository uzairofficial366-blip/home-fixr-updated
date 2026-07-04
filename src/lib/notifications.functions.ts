import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ensureSchema, getSql } from "./db.server";
import { requireSession } from "./auth.server";

export const listNotifications = createServerFn({ method: "GET" }).handler(async () => {
  const s = await requireSession();
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM notifications WHERE user_id = ${s.uid} ORDER BY created_at DESC LIMIT 50
  `;
  return rows as Array<{
    id: number;
    user_id: number;
    title: string;
    body: string;
    link: string | null;
    is_read: boolean;
    created_at: string;
  }>;
});

export const unreadCount = createServerFn({ method: "GET" }).handler(async () => {
  const s = await requireSession();
  await ensureSchema();
  const sql = getSql();
  const rows =
    await sql`SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = ${s.uid} AND is_read = false`;
  return (rows[0] as { count: number }).count;
});

export const markRead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    const s = await requireSession();
    await ensureSchema();
    const sql = getSql();
    await sql`UPDATE notifications SET is_read = true WHERE id = ${data.id} AND user_id = ${s.uid}`;
    return { ok: true };
  });

export const markAllRead = createServerFn({ method: "POST" }).handler(async () => {
  const s = await requireSession();
  await ensureSchema();
  const sql = getSql();
  await sql`UPDATE notifications SET is_read = true WHERE user_id = ${s.uid}`;
  return { ok: true };
});
