import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../database/prisma.js";
import { env } from "../config/env.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { LoginSchema, AdminVerifyProviderSchema, CreateAdminSchema } from "../validators/index.js";
import { AuthRequest } from "../middleware/authenticate.js";

function signToken(payload: { uid: number; role: string; email: string }) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "30d" });
}

// ─── Admin Login ──────────────────────────────────────────────────────────────
export async function adminLogin(req: Request, res: Response) {
  const parse = LoginSchema.safeParse(req.body);
  if (!parse.success) { sendError(res, parse.error.issues[0]?.message || "Validation error", 422); return; }

  const user = await prisma.user.findFirst({
    where: { email: parse.data.email.toLowerCase(), role: "admin" },
  });
  if (!user) { sendError(res, "Invalid admin credentials", 401); return; }

  const ok = await verifyPassword(parse.data.password, user.passwordHash);
  if (!ok) { sendError(res, "Invalid admin credentials", 401); return; }

  const token = signToken({ uid: user.id, role: user.role, email: user.email });
  sendSuccess(res, { token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export async function getDashboardStats(_req: AuthRequest, res: Response) {
  const [
    customers, providers, pendingVerif, activeJobs,
    activeBids, completedJobs, escrow, revenue, pendingPayments, reviews,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "homeowner" } }),
    prisma.user.count({ where: { role: "provider" } }),
    prisma.providerProfile.count({ where: { verificationStatus: "pending" } }),
    prisma.job.count({ where: { status: { in: ["open", "in_progress"] } } }),
    prisma.bid.count({ where: { status: "pending" } }),
    prisma.job.count({ where: { status: "completed" } }),
    prisma.$queryRaw<{ t: number }[]>`SELECT COALESCE(SUM(amount),0)::numeric AS t FROM payments WHERE status = 'held'`,
    prisma.$queryRaw<{ t: number }[]>`SELECT COALESCE(SUM(amount),0)::numeric AS t FROM payments WHERE status = 'released'`,
    prisma.payment.count({ where: { status: "pending" } }),
    prisma.review.count(),
  ]);

  sendSuccess(res, {
    totalCustomers: customers,
    totalProviders: providers,
    pendingVerifications: pendingVerif,
    activeJobs,
    activeBids,
    completedJobs,
    escrowBalance: Number((escrow[0] as { t: number }).t),
    totalRevenue: Number((revenue[0] as { t: number }).t),
    pendingPayments,
    totalReviews: reviews,
  });
}

// ─── Recent Activity ──────────────────────────────────────────────────────────
export async function getRecentActivity(_req: AuthRequest, res: Response) {
  const rows = await prisma.$queryRaw<unknown[]>`
    (SELECT 'signup' AS type, id, name, email, created_at, NULL::text AS detail FROM users WHERE role IN ('homeowner','provider'))
    UNION ALL
    (SELECT 'job' AS type, j.id, u.name, u.email, j.created_at, j.title AS detail FROM jobs j JOIN users u ON u.id = j.homeowner_id)
    UNION ALL
    (SELECT 'payment' AS type, p.id, u.name, u.email, p.created_at, p.amount::text AS detail FROM payments p JOIN jobs j ON j.id = p.job_id JOIN users u ON u.id = j.homeowner_id)
    ORDER BY created_at DESC LIMIT 20
  `;
  sendSuccess(res, rows);
}

// ─── Online Users ─────────────────────────────────────────────────────────────
export async function getOnlineUsers(_req: AuthRequest, res: Response) {
  const [rows, recent] = await Promise.all([
    prisma.$queryRaw<{ online_users: number }[]>`
      SELECT COUNT(DISTINCT u.id)::int AS online_users FROM users u
      WHERE u.created_at >= NOW() - INTERVAL '30 days'
        AND EXISTS (
          SELECT 1 FROM jobs j WHERE j.homeowner_id = u.id AND j.created_at >= NOW() - INTERVAL '30 days'
          UNION ALL SELECT 1 FROM bids b WHERE b.provider_id = u.id AND b.created_at >= NOW() - INTERVAL '30 days'
          UNION ALL SELECT 1 FROM messages m WHERE m.sender_id = u.id AND m.created_at >= NOW() - INTERVAL '30 days'
        )
    `,
    prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
  ]);
  sendSuccess(res, { onlineUsers: rows[0].online_users, recentSignups: recent });
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function listUsers(req: AuthRequest, res: Response) {
  const { search, role, page = 0 } = req.query as { search?: string; role?: string; page?: string };
  const offset = (Number(page) || 0) * 20;
  const searchPat = search ? `%${search}%` : null;
  const rolePat = role && role !== "all" ? role : null;

  const [rows, total] = await Promise.all([
    prisma.$queryRaw<unknown[]>`
      SELECT u.id, u.email, u.name, u.role, u.phone, u.created_at,
        CASE WHEN u.role = 'provider' THEN pp.verification_status ELSE NULL END AS verification_status,
        (SELECT COUNT(*)::int FROM jobs j WHERE j.homeowner_id = u.id) AS job_count,
        (SELECT COUNT(*)::int FROM bids b WHERE b.provider_id = u.id) AS bid_count
      FROM users u LEFT JOIN provider_profiles pp ON pp.user_id = u.id
      WHERE u.role IN ('homeowner','provider')
        AND (${searchPat}::text IS NULL OR u.name ILIKE ${searchPat} OR u.email ILIKE ${searchPat})
        AND (${rolePat}::text IS NULL OR u.role = ${rolePat})
      ORDER BY u.created_at DESC LIMIT 20 OFFSET ${offset}
    `,
    prisma.$queryRaw<{ c: number }[]>`
      SELECT COUNT(*)::int AS c FROM users u
      WHERE u.role IN ('homeowner','provider')
        AND (${searchPat}::text IS NULL OR u.name ILIKE ${searchPat} OR u.email ILIKE ${searchPat})
        AND (${rolePat}::text IS NULL OR u.role = ${rolePat})
    `,
  ]);
  sendSuccess(res, { users: rows, total: (total[0] as { c: number }).c });
}

export async function suspendUser(req: AuthRequest, res: Response) {
  const userId = parseInt(String(req.params.userId || req.body.userId));
  if (isNaN(userId)) { sendError(res, "Invalid user ID", 400); return; }
  await prisma.user.updateMany({ where: { id: userId, role: { in: ["homeowner", "provider"] } }, data: { role: "suspended" } });
  sendSuccess(res, { ok: true });
}

export async function deleteUser(req: AuthRequest, res: Response) {
  const userId = parseInt(String(req.params.userId || req.body.userId));
  if (isNaN(userId)) { sendError(res, "Invalid user ID", 400); return; }
  await prisma.user.deleteMany({ where: { id: userId, role: { in: ["homeowner", "provider"] } } });
  sendSuccess(res, { ok: true });
}

// ─── Providers ────────────────────────────────────────────────────────────────
export async function listProviders(req: AuthRequest, res: Response) {
  const { search, status, page = 0 } = req.query as { search?: string; status?: string; page?: string };
  const offset = (Number(page) || 0) * 20;
  const searchPat = search ? `%${search}%` : null;
  const statusPat = status && status !== "all" ? status : null;

  const [rows, total] = await Promise.all([
    prisma.$queryRaw<unknown[]>`
      SELECT u.id, u.email, u.name, u.phone, u.created_at,
        pp.verification_status, pp.bio, pp.categories, pp.hourly_rate, pp.years_experience, pp.is_available,
        COALESCE((SELECT AVG(r.rating)::float FROM reviews r WHERE r.provider_id = u.id), 0) AS avg_rating,
        (SELECT COUNT(*)::int FROM reviews r WHERE r.provider_id = u.id) AS review_count,
        (SELECT COUNT(*)::int FROM jobs j JOIN bids b ON b.id = j.accepted_bid_id WHERE b.provider_id = u.id AND j.status = 'completed') AS completed_jobs,
        (SELECT COUNT(*)::int FROM bids b WHERE b.provider_id = u.id) AS total_bids
      FROM users u JOIN provider_profiles pp ON pp.user_id = u.id
      WHERE u.role = 'provider'
        AND (${searchPat}::text IS NULL OR u.name ILIKE ${searchPat} OR u.email ILIKE ${searchPat})
        AND (${statusPat}::text IS NULL OR pp.verification_status = ${statusPat})
      ORDER BY u.created_at DESC LIMIT 20 OFFSET ${offset}
    `,
    prisma.$queryRaw<{ c: number }[]>`
      SELECT COUNT(*)::int AS c FROM users u JOIN provider_profiles pp ON pp.user_id = u.id
      WHERE u.role = 'provider'
        AND (${searchPat}::text IS NULL OR u.name ILIKE ${searchPat} OR u.email ILIKE ${searchPat})
        AND (${statusPat}::text IS NULL OR pp.verification_status = ${statusPat})
    `,
  ]);
  sendSuccess(res, { providers: rows, total: (total[0] as { c: number }).c });
}

export async function verifyProvider(req: AuthRequest, res: Response) {
  const parse = AdminVerifyProviderSchema.safeParse(req.body);
  if (!parse.success) { sendError(res, parse.error.issues[0]?.message || "Validation error", 422); return; }
  const { providerId, decision, notes } = parse.data;
  const finalNotes = notes ?? (decision === "verified" ? "Approved by admin." : "Rejected by admin.");

  await prisma.providerProfile.update({
    where: { userId: providerId },
    data: { verificationStatus: decision, verificationNotes: finalNotes },
  });

  const latestRequest = await prisma.verificationRequest.findFirst({
    where: { providerId, status: "pending" },
    orderBy: { submittedAt: "desc" },
  });
  if (latestRequest) {
    await prisma.verificationRequest.update({
      where: { id: latestRequest.id },
      data: { status: decision, adminNotes: finalNotes, reviewedAt: new Date() },
    });
  }

  const msg = decision === "verified"
    ? "Your identity verification has been approved. You are now a verified provider!"
    : `Your identity verification was rejected. Reason: ${finalNotes}`;

  await prisma.notification.create({
    data: {
      userId: providerId,
      title: decision === "verified" ? "Verification Approved ✓" : "Verification Rejected",
      body: msg,
      link: "/provider",
    },
  });
  sendSuccess(res, { ok: true });
}

export async function suspendProvider(req: AuthRequest, res: Response) {
  const providerId = parseInt(String(req.params.providerId || req.body.providerId));
  if (isNaN(providerId)) { sendError(res, "Invalid provider ID", 400); return; }
  await prisma.user.updateMany({ where: { id: providerId, role: "provider" }, data: { role: "suspended" } });
  sendSuccess(res, { ok: true });
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────
export async function listAdminJobs(req: AuthRequest, res: Response) {
  const { search, status, page = 0 } = req.query as { search?: string; status?: string; page?: string };
  const offset = (Number(page) || 0) * 20;
  const searchPat = search ? `%${search}%` : null;
  const statusPat = status && status !== "all" ? status : null;

  const [rows, total] = await Promise.all([
    prisma.$queryRaw<unknown[]>`
      SELECT j.id, j.title, j.category, j.status, j.budget, j.address, j.created_at,
        u.name AS homeowner_name, u.email AS homeowner_email,
        (SELECT COUNT(*)::int FROM bids b WHERE b.job_id = j.id) AS bid_count,
        (SELECT COUNT(*)::int FROM bids b WHERE b.job_id = j.id AND b.status = 'accepted') AS accepted_bids
      FROM jobs j JOIN users u ON u.id = j.homeowner_id
      WHERE (${searchPat}::text IS NULL OR j.title ILIKE ${searchPat} OR u.name ILIKE ${searchPat} OR j.category ILIKE ${searchPat})
        AND (${statusPat}::text IS NULL OR j.status = ${statusPat})
      ORDER BY j.created_at DESC LIMIT 20 OFFSET ${offset}
    `,
    prisma.$queryRaw<{ c: number }[]>`
      SELECT COUNT(*)::int AS c FROM jobs j JOIN users u ON u.id = j.homeowner_id
      WHERE (${searchPat}::text IS NULL OR j.title ILIKE ${searchPat} OR u.name ILIKE ${searchPat} OR j.category ILIKE ${searchPat})
        AND (${statusPat}::text IS NULL OR j.status = ${statusPat})
    `,
  ]);
  sendSuccess(res, { jobs: rows, total: (total[0] as { c: number }).c });
}

export async function cancelJob(req: AuthRequest, res: Response) {
  const jobId = parseInt(String(req.params.jobId || req.body.jobId));
  if (isNaN(jobId)) { sendError(res, "Invalid job ID", 400); return; }
  await prisma.job.update({ where: { id: jobId }, data: { status: "cancelled" } });
  sendSuccess(res, { ok: true });
}

// ─── Bids ─────────────────────────────────────────────────────────────────────
export async function listAdminBids(req: AuthRequest, res: Response) {
  const { search, status, page = 0 } = req.query as { search?: string; status?: string; page?: string };
  const offset = (Number(page) || 0) * 20;
  const searchPat = search ? `%${search}%` : null;
  const statusPat = status && status !== "all" ? status : null;

  const [rows, total] = await Promise.all([
    prisma.$queryRaw<unknown[]>`
      SELECT b.id, b.status, b.total, b.hourly_rate, b.hours_estimate, b.equipment_cost, b.message, b.created_at,
        j.id AS job_id, j.title AS job_title, j.status AS job_status,
        u.name AS provider_name, u.email AS provider_email
      FROM bids b JOIN jobs j ON j.id = b.job_id JOIN users u ON u.id = b.provider_id
      WHERE (${searchPat}::text IS NULL OR j.title ILIKE ${searchPat} OR u.name ILIKE ${searchPat})
        AND (${statusPat}::text IS NULL OR b.status = ${statusPat})
      ORDER BY b.created_at DESC LIMIT 20 OFFSET ${offset}
    `,
    prisma.$queryRaw<{ c: number }[]>`
      SELECT COUNT(*)::int AS c FROM bids b JOIN jobs j ON j.id = b.job_id JOIN users u ON u.id = b.provider_id
      WHERE (${searchPat}::text IS NULL OR j.title ILIKE ${searchPat} OR u.name ILIKE ${searchPat})
        AND (${statusPat}::text IS NULL OR b.status = ${statusPat})
    `,
  ]);
  sendSuccess(res, { bids: rows, total: (total[0] as { c: number }).c });
}

// ─── Payments ─────────────────────────────────────────────────────────────────
export async function listAdminPayments(req: AuthRequest, res: Response) {
  const { status, page = 0 } = req.query as { status?: string; page?: string };
  const offset = (Number(page) || 0) * 20;
  const statusPat = status && status !== "all" ? status : null;

  const [rows, total, summary] = await Promise.all([
    prisma.$queryRaw<unknown[]>`
      SELECT p.id, p.amount, p.status, p.created_at, p.updated_at,
        j.id AS job_id, j.title AS job_title,
        u.name AS homeowner_name, u.email AS homeowner_email
      FROM payments p JOIN jobs j ON j.id = p.job_id JOIN users u ON u.id = j.homeowner_id
      WHERE (${statusPat}::text IS NULL OR p.status = ${statusPat})
      ORDER BY p.created_at DESC LIMIT 20 OFFSET ${offset}
    `,
    prisma.$queryRaw<{ c: number }[]>`
      SELECT COUNT(*)::int AS c FROM payments p WHERE (${statusPat}::text IS NULL OR p.status = ${statusPat})
    `,
    prisma.$queryRaw<Record<string, number>[]>`
      SELECT
        COALESCE(SUM(CASE WHEN status='held' THEN amount ELSE 0 END),0)::numeric AS escrow,
        COALESCE(SUM(CASE WHEN status='released' THEN amount ELSE 0 END),0)::numeric AS released,
        COALESCE(SUM(CASE WHEN status='pending' THEN amount ELSE 0 END),0)::numeric AS pending,
        COALESCE(SUM(CASE WHEN status='refunded' THEN amount ELSE 0 END),0)::numeric AS refunded
      FROM payments
    `,
  ]);
  sendSuccess(res, { payments: rows, total: (total[0] as { c: number }).c, summary: summary[0] });
}

export async function refundPayment(req: AuthRequest, res: Response) {
  const paymentId = parseInt(String(req.params.paymentId || req.body.paymentId));
  if (isNaN(paymentId)) { sendError(res, "Invalid payment ID", 400); return; }
  await prisma.payment.update({ where: { id: paymentId }, data: { status: "refunded", updatedAt: new Date() } });
  sendSuccess(res, { ok: true });
}

// ─── Reviews ──────────────────────────────────────────────────────────────────
export async function listAdminReviews(req: AuthRequest, res: Response) {
  const { search, page = 0 } = req.query as { search?: string; page?: string };
  const offset = (Number(page) || 0) * 20;
  const searchPat = search ? `%${search}%` : null;

  const [rows, total] = await Promise.all([
    prisma.$queryRaw<unknown[]>`
      SELECT r.id, r.rating, r.comment, r.created_at,
        j.id AS job_id, j.title AS job_title,
        reviewer.name AS reviewer_name, reviewer.email AS reviewer_email,
        provider.name AS provider_name
      FROM reviews r
      JOIN jobs j ON j.id = r.job_id
      JOIN users reviewer ON reviewer.id = r.reviewer_id
      JOIN users provider ON provider.id = r.provider_id
      WHERE (${searchPat}::text IS NULL OR reviewer.name ILIKE ${searchPat} OR provider.name ILIKE ${searchPat} OR j.title ILIKE ${searchPat})
      ORDER BY r.created_at DESC LIMIT 20 OFFSET ${offset}
    `,
    prisma.$queryRaw<{ c: number }[]>`
      SELECT COUNT(*)::int AS c FROM reviews r
      JOIN jobs j ON j.id = r.job_id
      JOIN users reviewer ON reviewer.id = r.reviewer_id
      JOIN users provider ON provider.id = r.provider_id
      WHERE (${searchPat}::text IS NULL OR reviewer.name ILIKE ${searchPat} OR provider.name ILIKE ${searchPat} OR j.title ILIKE ${searchPat})
    `,
  ]);
  sendSuccess(res, { reviews: rows, total: (total[0] as { c: number }).c });
}

export async function deleteReview(req: AuthRequest, res: Response) {
  const reviewId = parseInt(String(req.params.reviewId || req.body.reviewId));
  if (isNaN(reviewId)) { sendError(res, "Invalid review ID", 400); return; }
  await prisma.review.delete({ where: { id: reviewId } });
  sendSuccess(res, { ok: true });
}

// ─── Verifications ────────────────────────────────────────────────────────────
export async function listVerifications(req: AuthRequest, res: Response) {
  const { status, page = 0 } = req.query as { status?: string; page?: string };
  const offset = (Number(page) || 0) * 20;
  const statusPat = status && status !== "all" ? status : null;

  const [rows, total] = await Promise.all([
    prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT vr.id, vr.provider_id, vr.status, vr.full_name, vr.document_type,
        vr.document_description, vr.id_document_url, vr.license_document_url,
        vr.admin_notes, vr.submitted_at, vr.reviewed_at,
        u.name, u.email,
        pp.verification_status AS profile_status
      FROM verification_requests vr
      JOIN users u ON u.id = vr.provider_id
      LEFT JOIN provider_profiles pp ON pp.user_id = vr.provider_id
      WHERE (${statusPat}::text IS NULL OR vr.status = ${statusPat})
      ORDER BY vr.submitted_at DESC LIMIT 20 OFFSET ${offset}
    `,
    prisma.$queryRaw<{ c: number }[]>`
      SELECT COUNT(*)::int AS c FROM verification_requests vr
      WHERE (${statusPat}::text IS NULL OR vr.status = ${statusPat})
    `,
  ]);

  const verifications = await Promise.all(
    rows.map(async (row: any) => {
      const docs = await prisma.uploadedDocument.findMany({
        where: { providerId: Number(row.provider_id) },
        orderBy: { uploadedAt: "desc" },
        select: { id: true, documentType: true, originalName: true, fileUrl: true, mimeType: true, sizeBytes: true, uploadedAt: true },
      });
      return { ...row, documents: docs };
    })
  );
  sendSuccess(res, { verifications, total: (total[0] as { c: number }).c });
}

// ─── Categories ───────────────────────────────────────────────────────────────
export async function listCategories(_req: AuthRequest, res: Response) {
  const rows = await prisma.$queryRaw<unknown[]>`
    SELECT c.id, c.name, c.description, c.created_at,
      (SELECT COUNT(*)::int FROM jobs j WHERE j.category = c.name) AS job_count
    FROM categories c ORDER BY c.name ASC
  `;
  sendSuccess(res, rows);
}

export async function createCategory(req: AuthRequest, res: Response) {
  const { name, description = "" } = req.body as { name?: string; description?: string };
  if (!name || name.trim().length === 0) { sendError(res, "Category name is required", 400); return; }
  await prisma.category.upsert({ where: { name: name.trim() }, update: {}, create: { name: name.trim(), description } });
  sendSuccess(res, { ok: true }, 201);
}

export async function deleteCategory(req: AuthRequest, res: Response) {
  const categoryId = parseInt(String(req.params.categoryId || req.body.categoryId));
  if (isNaN(categoryId)) { sendError(res, "Invalid category ID", 400); return; }
  await prisma.category.delete({ where: { id: categoryId } });
  sendSuccess(res, { ok: true });
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export async function getSettings(_req: AuthRequest, res: Response) {
  const rows = await prisma.setting.findMany();
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  sendSuccess(res, map);
}

export async function saveSettings(req: AuthRequest, res: Response) {
  const data = req.body as Record<string, string>;
  for (const [key, value] of Object.entries(data)) {
    await prisma.setting.upsert({ where: { key }, update: { value, updatedAt: new Date() }, create: { key, value } });
  }
  sendSuccess(res, { ok: true });
}

// ─── Admins ───────────────────────────────────────────────────────────────────
export async function listAdmins(_req: AuthRequest, res: Response) {
  const admins = await prisma.user.findMany({
    where: { role: "admin" },
    select: { id: true, email: true, name: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  sendSuccess(res, admins);
}

export async function createAdmin(req: AuthRequest, res: Response) {
  const parse = CreateAdminSchema.safeParse(req.body);
  if (!parse.success) { sendError(res, parse.error.issues[0]?.message || "Validation error", 422); return; }

  const existing = await prisma.user.findUnique({ where: { email: parse.data.email.toLowerCase() } });
  if (existing) { sendError(res, "Email already exists", 409); return; }

  const passwordHash = await hashPassword(parse.data.password);
  const admin = await prisma.user.create({
    data: { email: parse.data.email.toLowerCase(), passwordHash, name: parse.data.name, role: "admin" },
    select: { id: true, email: true, name: true },
  });
  sendSuccess(res, admin, 201);
}

export async function deleteAdmin(req: AuthRequest, res: Response) {
  const adminId = parseInt(String(req.params.adminId || req.body.adminId));
  if (isNaN(adminId)) { sendError(res, "Invalid admin ID", 400); return; }
  if (adminId === req.user!.uid) { sendError(res, "Cannot delete your own account", 400); return; }
  await prisma.user.deleteMany({ where: { id: adminId, role: "admin" } });
  sendSuccess(res, { ok: true });
}

// ─── Reports ──────────────────────────────────────────────────────────────────
export async function getReports(req: AuthRequest, res: Response) {
  const days = Number(req.query.days) || 30;

  try {
    const reports = await prisma.$queryRaw<any[]>`
      WITH daily_series AS (
        SELECT GENERATE_SERIES(
          CURRENT_DATE - (CAST(${days} AS INT) - 1) * INTERVAL '1 day',
          CURRENT_DATE,
          '1 day'::interval
        )::date AS date
      ),
      daily_users AS (
        SELECT DATE(created_at) AS date, COUNT(*)::int AS count
        FROM users
        WHERE role IN ('homeowner', 'provider')
        GROUP BY DATE(created_at)
      ),
      daily_providers AS (
        SELECT DATE(created_at) AS date, COUNT(*)::int AS count
        FROM users
        WHERE role = 'provider'
        GROUP BY DATE(created_at)
      ),
      daily_jobs AS (
        SELECT DATE(created_at) AS date, COUNT(*)::int AS count
        FROM jobs
        GROUP BY DATE(created_at)
      ),
      daily_revenue AS (
        SELECT DATE(created_at) AS date, SUM(amount)::numeric AS total
        FROM payments
        WHERE status = 'released'
        GROUP BY DATE(created_at)
      )
      SELECT
        ds.date::text AS date,
        COALESCE(du.count, 0) AS users,
        COALESCE(dp.count, 0) AS providers,
        COALESCE(dj.count, 0) AS jobs,
        COALESCE(dr.total, 0)::float AS revenue
      FROM daily_series ds
      LEFT JOIN daily_users du ON ds.date = du.date
      LEFT JOIN daily_providers dp ON ds.date = dp.date
      LEFT JOIN daily_jobs dj ON ds.date = dj.date
      LEFT JOIN daily_revenue dr ON ds.date = dr.date
      ORDER BY ds.date DESC
    `;
    sendSuccess(res, reports);
  } catch (error) {
    sendError(res, (error as Error).message, 500);
  }
}


// ─── Notifications (Admin) ────────────────────────────────────────────────────
export async function listAdminNotifications(req: AuthRequest, res: Response) {
  const page = Number((req.query.page as string)) || 0;
  const offset = page * 20;

  const [rows, total] = await Promise.all([
    prisma.$queryRaw<unknown[]>`
      SELECT n.id, n.user_id, n.title, n.body, n.link, n.is_read, n.created_at,
        u.name AS user_name, u.email AS user_email, u.role AS user_role
      FROM notifications n JOIN users u ON u.id = n.user_id
      ORDER BY n.created_at DESC LIMIT 20 OFFSET ${offset}
    `,
    prisma.notification.count(),
  ]);
  sendSuccess(res, { notifications: rows, total });
}

export async function adminMarkNotificationRead(req: AuthRequest, res: Response) {
  const id = parseInt(String(req.params.id || req.body.notificationId));
  if (isNaN(id)) { sendError(res, "Invalid notification ID", 400); return; }
  await prisma.notification.update({ where: { id }, data: { isRead: true } });
  sendSuccess(res, { ok: true });
}

export async function adminMarkAllNotificationsRead(_req: AuthRequest, res: Response) {
  await prisma.notification.updateMany({ data: { isRead: true } });
  sendSuccess(res, { ok: true });
}

// ─── Admin Profile ────────────────────────────────────────────────────────────
export async function updateAdminProfile(req: AuthRequest, res: Response) {
  const { name } = req.body as { name?: string };
  if (!name || name.trim().length === 0) { sendError(res, "Name is required", 400); return; }
  await prisma.user.update({ where: { id: req.user!.uid }, data: { name: name.trim() } });
  sendSuccess(res, { ok: true, name: name.trim() });
}

export async function adminChangePassword(req: AuthRequest, res: Response) {
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
  if (!currentPassword || !newPassword) { sendError(res, "Both passwords required", 400); return; }
  if (newPassword.length < 8) { sendError(res, "New password must be at least 8 characters", 400); return; }

  const user = await prisma.user.findUnique({ where: { id: req.user!.uid }, select: { passwordHash: true } });
  if (!user) { sendError(res, "User not found", 404); return; }

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) { sendError(res, "Current password is incorrect", 400); return; }

  const hash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: req.user!.uid }, data: { passwordHash: hash } });
  sendSuccess(res, { ok: true });
}

// ─── Escrow & Revenue ─────────────────────────────────────────────────────────
export async function getEscrowDetails(req: AuthRequest, res: Response) {
  const page = Number((req.query.page as string)) || 0;
  const offset = page * 20;

  const [rows, total, totalAmount] = await Promise.all([
    prisma.$queryRaw<unknown[]>`
      SELECT p.id, p.amount, p.status, p.created_at, p.updated_at,
        j.id AS job_id, j.title AS job_title, u.name AS homeowner_name, u.email AS homeowner_email
      FROM payments p JOIN jobs j ON j.id = p.job_id JOIN users u ON u.id = j.homeowner_id
      WHERE p.status = 'held' ORDER BY p.created_at DESC LIMIT 20 OFFSET ${offset}
    `,
    prisma.payment.count({ where: { status: "held" } }),
    prisma.$queryRaw<{ t: number }[]>`SELECT COALESCE(SUM(amount),0)::numeric AS t FROM payments WHERE status = 'held'`,
  ]);
  sendSuccess(res, { escrow: rows, total, totalAmount: Number((totalAmount[0] as { t: number }).t) });
}

export async function getRevenueDetails(req: AuthRequest, res: Response) {
  const page = Number((req.query.page as string)) || 0;
  const offset = page * 20;

  const [rows, total, totalAmount] = await Promise.all([
    prisma.$queryRaw<unknown[]>`
      SELECT p.id, p.amount, p.status, p.created_at, p.updated_at,
        j.id AS job_id, j.title AS job_title, u.name AS homeowner_name, u.email AS homeowner_email
      FROM payments p JOIN jobs j ON j.id = p.job_id JOIN users u ON u.id = j.homeowner_id
      WHERE p.status = 'released' ORDER BY p.created_at DESC LIMIT 20 OFFSET ${offset}
    `,
    prisma.payment.count({ where: { status: "released" } }),
    prisma.$queryRaw<{ t: number }[]>`SELECT COALESCE(SUM(amount),0)::numeric AS t FROM payments WHERE status = 'released'`,
  ]);
  sendSuccess(res, { payments: rows, total, totalAmount: Number((totalAmount[0] as { t: number }).t) });
}
