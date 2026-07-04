import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ensureSchema, getSql } from "./db.server";
import { hashPassword, verifyPassword, createSession, getSession } from "./auth.server";

// ─── Auth guard ───────────────────────────────────────────────────────────────
async function requireAdmin() {
  const s = await getSession();
  if (!s || s.role !== "admin") throw new Error("Unauthorized");
  return s;
}

// ─── Login ────────────────────────────────────────────────────────────────────
export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ email: z.string().email().max(200), password: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`
      SELECT id, email, role, name, password_hash
      FROM users WHERE email = ${data.email.toLowerCase()} AND role = 'admin'
    `;
    const u = rows[0] as { id: number; email: string; role: "admin"; name: string; password_hash: string } | undefined;
    if (!u) throw new Error("Invalid admin credentials");
    const ok = await verifyPassword(data.password, u.password_hash);
    if (!ok) throw new Error("Invalid admin credentials");
    await createSession({ uid: u.id, role: u.role, email: u.email });
    return { id: u.id, email: u.email, role: u.role, name: u.name };
  });

// ─── Dashboard stats ──────────────────────────────────────────────────────────
export const getDashboardStats = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  await ensureSchema();
  const sql = getSql();
  const [customers, providers, pendingVerif, activeJobs, activeBids, completedJobs, escrow, revenue, pendingPayments, reviews] =
    await Promise.all([
      sql`SELECT COUNT(*)::int AS c FROM users WHERE role = 'homeowner'`,
      sql`SELECT COUNT(*)::int AS c FROM users WHERE role = 'provider'`,
      sql`SELECT COUNT(*)::int AS c FROM provider_profiles WHERE verification_status = 'pending'`,
      sql`SELECT COUNT(*)::int AS c FROM jobs WHERE status IN ('open','in_progress')`,
      sql`SELECT COUNT(*)::int AS c FROM bids WHERE status = 'pending'`,
      sql`SELECT COUNT(*)::int AS c FROM jobs WHERE status = 'completed'`,
      sql`SELECT COALESCE(SUM(amount),0)::numeric AS t FROM payments WHERE status = 'held'`,
      sql`SELECT COALESCE(SUM(amount),0)::numeric AS t FROM payments WHERE status = 'released'`,
      sql`SELECT COUNT(*)::int AS c FROM payments WHERE status = 'pending'`,
      sql`SELECT COUNT(*)::int AS c FROM reviews`,
    ]);
  return {
    totalCustomers: (customers[0] as any).c,
    totalProviders: (providers[0] as any).c,
    pendingVerifications: (pendingVerif[0] as any).c,
    activeJobs: (activeJobs[0] as any).c,
    activeBids: (activeBids[0] as any).c,
    completedJobs: (completedJobs[0] as any).c,
    escrowBalance: Number((escrow[0] as any).t),
    totalRevenue: Number((revenue[0] as any).t),
    pendingPayments: (pendingPayments[0] as any).c,
    totalReviews: (reviews[0] as any).c,
  };
});

// ─── Recent activity ──────────────────────────────────────────────────────────
export const getRecentActivity = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    (SELECT 'signup' AS type, id, name, email, created_at, NULL::text AS detail FROM users WHERE role IN ('homeowner','provider'))
    UNION ALL
    (SELECT 'job' AS type, j.id, u.name, u.email, j.created_at, j.title AS detail FROM jobs j JOIN users u ON u.id = j.homeowner_id)
    UNION ALL
    (SELECT 'payment' AS type, p.id, u.name, u.email, p.created_at, p.amount::text AS detail FROM payments p JOIN jobs j ON j.id = p.job_id JOIN users u ON u.id = j.homeowner_id)
    ORDER BY created_at DESC LIMIT 20
  `;
  return rows as { type: string; id: number; name: string; email: string; created_at: string; detail: string | null }[];
});

// ─── Users ────────────────────────────────────────────────────────────────────
export const adminListUsers = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ search: z.string().optional(), role: z.string().optional(), page: z.number().int().min(0).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    await ensureSchema();
    const sql = getSql();
    const search = data.search ? `%${data.search}%` : null;
    const role = data.role && data.role !== "all" ? data.role : null;
    const offset = (data.page ?? 0) * 20;
    const rows = await sql`
      SELECT u.id, u.email, u.name, u.role, u.phone, u.created_at,
        CASE WHEN u.role = 'provider' THEN pp.verification_status ELSE NULL END AS verification_status,
        (SELECT COUNT(*)::int FROM jobs j WHERE j.homeowner_id = u.id) AS job_count,
        (SELECT COUNT(*)::int FROM bids b WHERE b.provider_id = u.id) AS bid_count
      FROM users u
      LEFT JOIN provider_profiles pp ON pp.user_id = u.id
      WHERE u.role IN ('homeowner','provider')
        AND (${search}::text IS NULL OR u.name ILIKE ${search} OR u.email ILIKE ${search})
        AND (${role}::text IS NULL OR u.role = ${role})
      ORDER BY u.created_at DESC
      LIMIT 20 OFFSET ${offset}
    `;
    const total = await sql`
      SELECT COUNT(*)::int AS c FROM users u
      WHERE u.role IN ('homeowner','provider')
        AND (${search}::text IS NULL OR u.name ILIKE ${search} OR u.email ILIKE ${search})
        AND (${role}::text IS NULL OR u.role = ${role})
    `;
    return { users: rows, total: (total[0] as any).c };
  });

export const adminSuspendUser = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ userId: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sql = getSql();
    await sql`UPDATE users SET role = 'suspended' WHERE id = ${data.userId} AND role IN ('homeowner','provider')`;
    return { ok: true };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ userId: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sql = getSql();
    await sql`DELETE FROM users WHERE id = ${data.userId} AND role IN ('homeowner','provider')`;
    return { ok: true };
  });

// ─── Providers ────────────────────────────────────────────────────────────────
export const adminListProviders = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ search: z.string().optional(), status: z.string().optional(), page: z.number().int().min(0).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    await ensureSchema();
    const sql = getSql();
    const search = data.search ? `%${data.search}%` : null;
    const status = data.status && data.status !== "all" ? data.status : null;
    const offset = (data.page ?? 0) * 20;
    const rows = await sql`
      SELECT u.id, u.email, u.name, u.phone, u.created_at,
        pp.verification_status, pp.bio, pp.categories, pp.hourly_rate, pp.years_experience, pp.is_available,
        COALESCE((SELECT AVG(r.rating)::float FROM reviews r WHERE r.provider_id = u.id), 0) AS avg_rating,
        (SELECT COUNT(*)::int FROM reviews r WHERE r.provider_id = u.id) AS review_count,
        (SELECT COUNT(*)::int FROM jobs j JOIN bids b ON b.id = j.accepted_bid_id WHERE b.provider_id = u.id AND j.status = 'completed') AS completed_jobs,
        (SELECT COUNT(*)::int FROM bids b WHERE b.provider_id = u.id) AS total_bids
      FROM users u
      JOIN provider_profiles pp ON pp.user_id = u.id
      WHERE u.role = 'provider'
        AND (${search}::text IS NULL OR u.name ILIKE ${search} OR u.email ILIKE ${search})
        AND (${status}::text IS NULL OR pp.verification_status = ${status})
      ORDER BY u.created_at DESC
      LIMIT 20 OFFSET ${offset}
    `;
    const total = await sql`
      SELECT COUNT(*)::int AS c FROM users u JOIN provider_profiles pp ON pp.user_id = u.id
      WHERE u.role = 'provider'
        AND (${search}::text IS NULL OR u.name ILIKE ${search} OR u.email ILIKE ${search})
        AND (${status}::text IS NULL OR pp.verification_status = ${status})
    `;
    return { providers: rows, total: (total[0] as any).c };
  });

export const adminVerifyProvider = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ providerId: z.number().int().positive(), decision: z.enum(["verified", "rejected"]), notes: z.string().max(1000).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const sql = getSql();
    const notes = data.notes ?? (data.decision === "verified" ? "Approved by admin." : "Rejected by admin.");
    await sql`UPDATE provider_profiles SET verification_status = ${data.decision}, verification_notes = ${notes} WHERE user_id = ${data.providerId}`;
    const msg = data.decision === "verified"
      ? "Your identity verification has been approved. You are now a verified provider!"
      : `Your identity verification was rejected. Reason: ${notes}`;
    await sql`INSERT INTO notifications (user_id, title, body, link) VALUES (${data.providerId}, ${data.decision === "verified" ? "Verification Approved ✓" : "Verification Rejected"}, ${msg}, '/provider')`;
    return { ok: true };
  });

export const adminSuspendProvider = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ providerId: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sql = getSql();
    await sql`UPDATE users SET role = 'suspended' WHERE id = ${data.providerId} AND role = 'provider'`;
    return { ok: true };
  });

// ─── Jobs ─────────────────────────────────────────────────────────────────────
export const adminListJobs = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ search: z.string().optional(), status: z.string().optional(), page: z.number().int().min(0).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    await ensureSchema();
    const sql = getSql();
    const search = data.search ? `%${data.search}%` : null;
    const status = data.status && data.status !== "all" ? data.status : null;
    const offset = (data.page ?? 0) * 20;
    const rows = await sql`
      SELECT j.id, j.title, j.category, j.status, j.budget, j.address, j.created_at,
        u.name AS homeowner_name, u.email AS homeowner_email,
        (SELECT COUNT(*)::int FROM bids b WHERE b.job_id = j.id) AS bid_count,
        (SELECT COUNT(*)::int FROM bids b WHERE b.job_id = j.id AND b.status = 'accepted') AS accepted_bids
      FROM jobs j JOIN users u ON u.id = j.homeowner_id
      WHERE (${search}::text IS NULL OR j.title ILIKE ${search} OR u.name ILIKE ${search} OR j.category ILIKE ${search})
        AND (${status}::text IS NULL OR j.status = ${status})
      ORDER BY j.created_at DESC
      LIMIT 20 OFFSET ${offset}
    `;
    const total = await sql`
      SELECT COUNT(*)::int AS c FROM jobs j JOIN users u ON u.id = j.homeowner_id
      WHERE (${search}::text IS NULL OR j.title ILIKE ${search} OR u.name ILIKE ${search} OR j.category ILIKE ${search})
        AND (${status}::text IS NULL OR j.status = ${status})
    `;
    return { jobs: rows, total: (total[0] as any).c };
  });

export const adminCancelJob = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ jobId: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sql = getSql();
    await sql`UPDATE jobs SET status = 'cancelled' WHERE id = ${data.jobId}`;
    return { ok: true };
  });

// ─── Bids ─────────────────────────────────────────────────────────────────────
export const adminListBids = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ search: z.string().optional(), status: z.string().optional(), page: z.number().int().min(0).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    await ensureSchema();
    const sql = getSql();
    const search = data.search ? `%${data.search}%` : null;
    const status = data.status && data.status !== "all" ? data.status : null;
    const offset = (data.page ?? 0) * 20;
    const rows = await sql`
      SELECT b.id, b.status, b.total, b.hourly_rate, b.hours_estimate, b.equipment_cost, b.message, b.created_at,
        j.id AS job_id, j.title AS job_title, j.status AS job_status,
        u.name AS provider_name, u.email AS provider_email
      FROM bids b
      JOIN jobs j ON j.id = b.job_id
      JOIN users u ON u.id = b.provider_id
      WHERE (${search}::text IS NULL OR j.title ILIKE ${search} OR u.name ILIKE ${search})
        AND (${status}::text IS NULL OR b.status = ${status})
      ORDER BY b.created_at DESC
      LIMIT 20 OFFSET ${offset}
    `;
    const total = await sql`
      SELECT COUNT(*)::int AS c FROM bids b JOIN jobs j ON j.id = b.job_id JOIN users u ON u.id = b.provider_id
      WHERE (${search}::text IS NULL OR j.title ILIKE ${search} OR u.name ILIKE ${search})
        AND (${status}::text IS NULL OR b.status = ${status})
    `;
    return { bids: rows, total: (total[0] as any).c };
  });

// ─── Payments ─────────────────────────────────────────────────────────────────
export const adminListPayments = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ status: z.string().optional(), page: z.number().int().min(0).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    await ensureSchema();
    const sql = getSql();
    const status = data.status && data.status !== "all" ? data.status : null;
    const offset = (data.page ?? 0) * 20;
    const rows = await sql`
      SELECT p.id, p.amount, p.status, p.created_at, p.updated_at,
        j.id AS job_id, j.title AS job_title,
        u.name AS homeowner_name, u.email AS homeowner_email
      FROM payments p
      JOIN jobs j ON j.id = p.job_id
      JOIN users u ON u.id = j.homeowner_id
      WHERE (${status}::text IS NULL OR p.status = ${status})
      ORDER BY p.created_at DESC
      LIMIT 20 OFFSET ${offset}
    `;
    const total = await sql`
      SELECT COUNT(*)::int AS c FROM payments p
      WHERE (${status}::text IS NULL OR p.status = ${status})
    `;
    const summary = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN status='held' THEN amount ELSE 0 END),0)::numeric AS escrow,
        COALESCE(SUM(CASE WHEN status='released' THEN amount ELSE 0 END),0)::numeric AS released,
        COALESCE(SUM(CASE WHEN status='pending' THEN amount ELSE 0 END),0)::numeric AS pending,
        COALESCE(SUM(CASE WHEN status='refunded' THEN amount ELSE 0 END),0)::numeric AS refunded
      FROM payments
    `;
    return { payments: rows, total: (total[0] as any).c, summary: summary[0] };
  });

export const adminRefundPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ paymentId: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sql = getSql();
    await sql`UPDATE payments SET status = 'refunded', updated_at = NOW() WHERE id = ${data.paymentId}`;
    return { ok: true };
  });

// ─── Reviews ──────────────────────────────────────────────────────────────────
export const adminListReviews = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ search: z.string().optional(), page: z.number().int().min(0).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    await ensureSchema();
    const sql = getSql();
    const search = data.search ? `%${data.search}%` : null;
    const offset = (data.page ?? 0) * 20;
    const rows = await sql`
      SELECT r.id, r.rating, r.comment, r.created_at,
        j.id AS job_id, j.title AS job_title,
        reviewer.name AS reviewer_name, reviewer.email AS reviewer_email,
        provider.name AS provider_name
      FROM reviews r
      JOIN jobs j ON j.id = r.job_id
      JOIN users reviewer ON reviewer.id = r.reviewer_id
      JOIN users provider ON provider.id = r.provider_id
      WHERE (${search}::text IS NULL OR reviewer.name ILIKE ${search} OR provider.name ILIKE ${search} OR j.title ILIKE ${search})
      ORDER BY r.created_at DESC
      LIMIT 20 OFFSET ${offset}
    `;
    const total = await sql`
      SELECT COUNT(*)::int AS c FROM reviews r
      JOIN jobs j ON j.id = r.job_id
      JOIN users reviewer ON reviewer.id = r.reviewer_id
      JOIN users provider ON provider.id = r.provider_id
      WHERE (${search}::text IS NULL OR reviewer.name ILIKE ${search} OR provider.name ILIKE ${search} OR j.title ILIKE ${search})
    `;
    return { reviews: rows, total: (total[0] as any).c };
  });

export const adminDeleteReview = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ reviewId: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sql = getSql();
    await sql`DELETE FROM reviews WHERE id = ${data.reviewId}`;
    return { ok: true };
  });

// ─── Verifications ────────────────────────────────────────────────────────────
export const adminListVerifications = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ status: z.string().optional(), page: z.number().int().min(0).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    await ensureSchema();
    const sql = getSql();
    const status = data.status && data.status !== "all" ? data.status : null;
    const offset = (data.page ?? 0) * 20;
    const rows = await sql`
      SELECT vr.id, vr.provider_id, vr.status, vr.full_name, vr.document_type,
        vr.document_description, vr.id_document_url, vr.license_document_url,
        vr.admin_notes, vr.submitted_at, vr.reviewed_at,
        u.name, u.email,
        pp.verification_status AS profile_status
      FROM verification_requests vr
      JOIN users u ON u.id = vr.provider_id
      LEFT JOIN provider_profiles pp ON pp.user_id = vr.provider_id
      WHERE (${status}::text IS NULL OR vr.status = ${status})
      ORDER BY vr.submitted_at DESC
      LIMIT 20 OFFSET ${offset}
    `;
    const total = await sql`
      SELECT COUNT(*)::int AS c FROM verification_requests vr
      WHERE (${status}::text IS NULL OR vr.status = ${status})
    `;
    return { verifications: rows, total: (total[0] as any).c };
  });

// ─── Categories ───────────────────────────────────────────────────────────────
export const adminListCategories = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  await ensureSchema();
  const sql = getSql();
  // Ensure categories table exists
  await sql`CREATE TABLE IF NOT EXISTS categories (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, description TEXT DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  const rows = await sql`
    SELECT c.id, c.name, c.description, c.created_at,
      (SELECT COUNT(*)::int FROM jobs j WHERE j.category = c.name) AS job_count
    FROM categories c ORDER BY c.name ASC
  `;
  return rows as { id: number; name: string; description: string; created_at: string; job_count: number }[];
});

export const adminCreateCategory = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ name: z.string().min(1).max(100), description: z.string().max(500).optional() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sql = getSql();
    await sql`CREATE TABLE IF NOT EXISTS categories (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, description TEXT DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
    await sql`INSERT INTO categories (name, description) VALUES (${data.name}, ${data.description ?? ""}) ON CONFLICT (name) DO NOTHING`;
    return { ok: true };
  });

export const adminDeleteCategory = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ categoryId: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sql = getSql();
    await sql`DELETE FROM categories WHERE id = ${data.categoryId}`;
    return { ok: true };
  });

// ─── Settings ─────────────────────────────────────────────────────────────────
export const adminGetSettings = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  await ensureSchema();
  const sql = getSql();
  await sql`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  const rows = await sql`SELECT key, value FROM settings`;
  const map: Record<string, string> = {};
  for (const r of rows as { key: string; value: string }[]) map[r.key] = r.value;
  return map;
});

export const adminSaveSettings = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.record(z.string(), z.string()).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sql = getSql();
    await sql`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
    for (const [key, value] of Object.entries(data)) {
      await sql`INSERT INTO settings (key, value) VALUES (${key}, ${value}) ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = NOW()`;
    }
    return { ok: true };
  });

// ─── Admins ───────────────────────────────────────────────────────────────────
export const getAdmins = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`SELECT id, email, name, created_at FROM users WHERE role = 'admin' ORDER BY created_at DESC`;
  return rows as { id: number; email: string; name: string; created_at: string }[];
});

export const createAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ email: z.string().email().max(200), password: z.string().min(8).max(200), name: z.string().min(1).max(120) }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    await ensureSchema();
    const sql = getSql();
    const existing = await sql`SELECT id FROM users WHERE email = ${data.email.toLowerCase()}`;
    if (existing.length > 0) throw new Error("Email already exists");
    const hash = await hashPassword(data.password);
    const rows = await sql`INSERT INTO users (email, password_hash, name, role) VALUES (${data.email.toLowerCase()}, ${hash}, ${data.name}, 'admin') RETURNING id, email, name`;
    return rows[0] as { id: number; email: string; name: string };
  });

export const deleteAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ adminId: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    const s = await requireAdmin();
    if (data.adminId === s.uid) throw new Error("Cannot delete your own account");
    const sql = getSql();
    await sql`DELETE FROM users WHERE id = ${data.adminId} AND role = 'admin'`;
    return { ok: true };
  });

// ─── Reports ──────────────────────────────────────────────────────────────────
export const adminGetReports = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  await ensureSchema();
  const sql = getSql();
  const [jobsByStatus, jobsByCategory, userGrowth, paymentsByMonth, topProviders] = await Promise.all([
    sql`SELECT status, COUNT(*)::int AS count FROM jobs GROUP BY status ORDER BY count DESC`,
    sql`SELECT category, COUNT(*)::int AS count FROM jobs GROUP BY category ORDER BY count DESC LIMIT 10`,
    sql`SELECT DATE_TRUNC('month', created_at) AS month, COUNT(*)::int AS count FROM users WHERE role IN ('homeowner','provider') GROUP BY month ORDER BY month DESC LIMIT 6`,
    sql`SELECT DATE_TRUNC('month', created_at) AS month, COALESCE(SUM(amount),0)::numeric AS total FROM payments WHERE status = 'released' GROUP BY month ORDER BY month DESC LIMIT 6`,
    sql`
      SELECT u.id, u.name, u.email,
        COALESCE(AVG(r.rating)::float, 0) AS avg_rating,
        COUNT(DISTINCT r.id)::int AS review_count,
        COUNT(DISTINCT j.id)::int AS completed_jobs
      FROM users u
      LEFT JOIN reviews r ON r.provider_id = u.id
      LEFT JOIN bids b ON b.provider_id = u.id
      LEFT JOIN jobs j ON j.accepted_bid_id = b.id AND j.status = 'completed'
      WHERE u.role = 'provider'
      GROUP BY u.id, u.name, u.email
      ORDER BY completed_jobs DESC, avg_rating DESC
      LIMIT 5
    `,
  ]);
  return { jobsByStatus, jobsByCategory, userGrowth, paymentsByMonth, topProviders };
});

// ─── Online users ─────────────────────────────────────────────────────────────
export const adminGetOnlineUsers = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT COUNT(DISTINCT u.id)::int AS online_users
    FROM users u
    WHERE u.created_at >= NOW() - INTERVAL '30 days'
      AND EXISTS (
        SELECT 1 FROM jobs j WHERE j.homeowner_id = u.id AND j.created_at >= NOW() - INTERVAL '30 days'
        UNION ALL
        SELECT 1 FROM bids b WHERE b.provider_id = u.id AND b.created_at >= NOW() - INTERVAL '30 days'
        UNION ALL
        SELECT 1 FROM messages m WHERE m.sender_id = u.id AND m.created_at >= NOW() - INTERVAL '30 days'
      )
  `;
  const recent = await sql`
    SELECT COUNT(*)::int AS c FROM users WHERE created_at >= NOW() - INTERVAL '30 days'
  `;
  return { onlineUsers: (rows[0] as any).online_users, recentSignups: (recent[0] as any).c };
});

// ─── Profile ──────────────────────────────────────────────────────────────────
export const adminUpdateProfile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ name: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data }) => {
    const s = await requireAdmin();
    const sql = getSql();
    await sql`UPDATE users SET name = ${data.name} WHERE id = ${s.uid}`;
    return { ok: true, name: data.name };
  });

export const adminChangePassword = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const s = await requireAdmin();
    const sql = getSql();
    const rows = await sql`SELECT password_hash FROM users WHERE id = ${s.uid}`;
    const u = rows[0] as { password_hash: string } | undefined;
    if (!u) throw new Error("User not found");
    const ok = await verifyPassword(data.currentPassword, u.password_hash);
    if (!ok) throw new Error("Current password is incorrect");
    const hash = await hashPassword(data.newPassword);
    await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${s.uid}`;
    return { ok: true };
  });

// ─── Notifications ─────────────────────────────────────────────────────────────
export const adminGetNotifications = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ page: z.number().int().min(0).optional() }).parse(d))
  .handler(async ({ data }) => {
    const s = await requireAdmin();
    await ensureSchema();
    const sql = getSql();
    const offset = (data.page ?? 0) * 20;
    const rows = await sql`
      SELECT n.id, n.user_id, n.title, n.body, n.link, n.is_read, n.created_at,
        u.name AS user_name, u.email AS user_email, u.role AS user_role
      FROM notifications n
      JOIN users u ON u.id = n.user_id
      ORDER BY n.created_at DESC
      LIMIT 20 OFFSET ${offset}
    `;
    const total = await sql`SELECT COUNT(*)::int AS c FROM notifications`;
    return { notifications: rows, total: (total[0] as any).c };
  });

export const adminMarkNotificationRead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ notificationId: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    const s = await requireAdmin();
    const sql = getSql();
    await sql`UPDATE notifications SET is_read = true WHERE id = ${data.notificationId}`;
    return { ok: true };
  });

export const adminMarkAllNotificationsRead = createServerFn({ method: "POST" }).handler(async () => {
  const s = await requireAdmin();
  const sql = getSql();
  await sql`UPDATE notifications SET is_read = true`;
  return { ok: true };
});

// ─── Escrow details ────────────────────────────────────────────────────────────
export const adminGetEscrowDetails = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ page: z.number().int().min(0).optional() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    await ensureSchema();
    const sql = getSql();
    const offset = (data.page ?? 0) * 20;
    const rows = await sql`
      SELECT p.id, p.amount, p.status, p.created_at, p.updated_at,
        j.id AS job_id, j.title AS job_title,
        u.name AS homeowner_name, u.email AS homeowner_email
      FROM payments p
      JOIN jobs j ON j.id = p.job_id
      JOIN users u ON u.id = j.homeowner_id
      WHERE p.status = 'held'
      ORDER BY p.created_at DESC
      LIMIT 20 OFFSET ${offset}
    `;
    const total = await sql`SELECT COUNT(*)::int AS c FROM payments WHERE status = 'held'`;
    const totalAmount = await sql`SELECT COALESCE(SUM(amount),0)::numeric AS t FROM payments WHERE status = 'held'`;
    return { escrow: rows, total: (total[0] as any).c, totalAmount: Number((totalAmount[0] as any).t) };
  });

// ─── Revenue details ──────────────────────────────────────────────────────────
export const adminGetRevenueDetails = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ page: z.number().int().min(0).optional() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    await ensureSchema();
    const sql = getSql();
    const offset = (data.page ?? 0) * 20;
    const rows = await sql`
      SELECT p.id, p.amount, p.status, p.created_at, p.updated_at,
        j.id AS job_id, j.title AS job_title,
        u.name AS homeowner_name, u.email AS homeowner_email
      FROM payments p
      JOIN jobs j ON j.id = p.job_id
      JOIN users u ON u.id = j.homeowner_id
      WHERE p.status = 'released'
      ORDER BY p.created_at DESC
      LIMIT 20 OFFSET ${offset}
    `;
    const total = await sql`SELECT COUNT(*)::int AS c FROM payments WHERE status = 'released'`;
    const totalAmount = await sql`SELECT COALESCE(SUM(amount),0)::numeric AS t FROM payments WHERE status = 'released'`;
    return { payments: rows, total: (total[0] as any).c, totalAmount: Number((totalAmount[0] as any).t) };
  });
