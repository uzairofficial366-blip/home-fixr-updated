import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ensureSchema, expireTimedOutJobs, getSql } from "./db.server";
import { requireSession } from "./auth.server";
import { CATEGORIES } from "./jobs.functions";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

type ProviderProfileRow = {
  user_id: number;
  bio: string;
  categories: string[];
  hourly_rate: number;
  years_experience: number;
  is_available: boolean;
  profile_picture_url: string | null;
  id_document_url: string | null;
  license_document_url: string | null;
  verification_status: string;
  verification_notes: string;
  name: string;
  email: string;
};

type PendingVerificationRow = {
  request_id: number;
  provider_id: number;
  user_id: number;
  verification_status: string;
  document_type: string;
  document_description: string;
  submitted_at: string;
  verification_notes: string | null;
  id_document_url: string;
  license_document_url: string | null;
  name: string;
  email: string;
};

export const getProviderProfile = createServerFn({ method: "GET" }).handler(async () => {
  const s = await requireSession();
  if (s.role !== "provider") throw new Error("Providers only");
  await ensureSchema();
  await expireTimedOutJobs();
  const sql = getSql();
  const rows = await sql`
    SELECT pp.*, u.name, u.email
    FROM provider_profiles pp JOIN users u ON u.id = pp.user_id WHERE pp.user_id = ${s.uid}
  `;
  const profile = rows[0] as ProviderProfileRow | undefined;
  if (!profile) return null;
  // Fetch uploaded documents
  const docs = await sql`
    SELECT id, document_type, original_name, file_url, mime_type, size_bytes, uploaded_at
    FROM uploaded_documents
    WHERE provider_id = ${s.uid}
    ORDER BY uploaded_at DESC
  `;
  return { ...profile, documents: docs };
});

export const getPublicProviderProfile = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    await ensureSchema();
    const sql = getSql();
    const prows = await sql`
      SELECT pp.user_id AS id, u.name, pp.bio, pp.categories, pp.hourly_rate,
        pp.years_experience, pp.is_available, pp.profile_picture_url, pp.verification_status,
        ROUND(pp.hourly_rate * 8, 2) AS daily_rate,
        COALESCE((SELECT AVG(rating)::float FROM reviews r WHERE r.provider_id = pp.user_id), 0) AS avg_rating,
        (SELECT COUNT(*)::int FROM reviews r WHERE r.provider_id = pp.user_id) AS review_count,
        (
          SELECT COUNT(*)::int
          FROM jobs j
          JOIN bids b ON b.id = j.accepted_bid_id
          WHERE b.provider_id = pp.user_id AND j.status = 'completed'
        ) AS completed_jobs
      FROM provider_profiles pp JOIN users u ON u.id = pp.user_id WHERE pp.user_id = ${data.id}
    `;
    const profile = prows[0];
    if (!profile) throw new Error("Provider not found");
    const reviews = await sql`
      SELECT r.rating, r.comment, r.created_at, u.name AS reviewer_name
      FROM reviews r JOIN users u ON u.id = r.reviewer_id
      WHERE r.provider_id = ${data.id} ORDER BY r.created_at DESC LIMIT 20
    `;
    return { profile, reviews };
  });

const UpdateProfile = z.object({
  bio: z.string().max(1000),
  categories: z.array(z.enum(CATEGORIES)).max(5),
  hourlyRate: z.number().min(0).max(1_000_000),
  yearsExperience: z.number().int().min(0).max(80),
  isAvailable: z.boolean(),
  profilePictureUrl: z.string().max(2_000_000).optional(),
});

export const updateProviderProfile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => UpdateProfile.parse(d))
  .handler(async ({ data }) => {
    const s = await requireSession();
    if (s.role !== "provider") throw new Error("Providers only");
    await ensureSchema();
    const sql = getSql();
    await sql`
      INSERT INTO provider_profiles (user_id, bio, categories, hourly_rate, years_experience, is_available, profile_picture_url)
      VALUES (${s.uid}, ${data.bio}, ${data.categories}, ${data.hourlyRate}, ${data.yearsExperience}, ${data.isAvailable}, ${data.profilePictureUrl || null})
      ON CONFLICT (user_id) DO UPDATE SET
        bio = EXCLUDED.bio,
        categories = EXCLUDED.categories,
        hourly_rate = EXCLUDED.hourly_rate,
        years_experience = EXCLUDED.years_experience,
        is_available = EXCLUDED.is_available,
        profile_picture_url = EXCLUDED.profile_picture_url
    `;
    return { ok: true };
  });

const DOCUMENT_TYPES = [
  "CNIC Front",
  "CNIC Back",
  "Passport",
  "Driving License",
  "Other Government ID",
] as const;

// Upload document — stores the base64 data URL directly in the DB (serverless-safe)
const UploadDocument = z.object({
  fileName: z.string().min(1).max(200),
  mimeType: z.string().min(1).max(100),
  // base64 data URL: "data:image/jpeg;base64,..."
  fileContentBase64: z.string().min(1),
  documentType: z.enum(DOCUMENT_TYPES),
});

export const uploadVerificationDocument = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => UploadDocument.parse(d))
  .handler(async ({ data }) => {
    const s = await requireSession();
    if (s.role !== "provider") throw new Error("Providers only");
    if (!ALLOWED_MIME_TYPES.has(data.mimeType))
      throw new Error("Only JPG, PNG, WebP, or PDF files are allowed.");

    // Strip the data URL prefix to get raw base64, then measure size
    const base64Data = data.fileContentBase64.includes(",")
      ? data.fileContentBase64.split(",")[1]
      : data.fileContentBase64;
    const sizeBytes = Math.round((base64Data.length * 3) / 4);
    if (sizeBytes > MAX_FILE_BYTES) throw new Error("File must be under 5MB.");
    if (sizeBytes === 0) throw new Error("File is empty.");

    await ensureSchema();
    const sql = getSql();

    // Store the full data URL so it can be rendered directly as <img src="...">
    const fileUrl = data.fileContentBase64.startsWith("data:")
      ? data.fileContentBase64
      : `data:${data.mimeType};base64,${base64Data}`;

    await sql`
      INSERT INTO uploaded_documents (provider_id, document_type, original_name, stored_name, mime_type, file_url, size_bytes)
      VALUES (${s.uid}, ${data.documentType}, ${data.fileName}, ${data.fileName}, ${data.mimeType}, ${fileUrl}, ${sizeBytes})
    `;

    // Also update the provider_profiles id_document_url with this data URL
    await sql`
      INSERT INTO provider_profiles (user_id, id_document_url)
      VALUES (${s.uid}, ${fileUrl})
      ON CONFLICT (user_id) DO UPDATE SET id_document_url = EXCLUDED.id_document_url
    `;

    return {
      fileUrl,
      documentType: data.documentType,
      originalName: data.fileName,
      mimeType: data.mimeType,
      sizeBytes,
    };
  });

const SubmitVerification = z.object({
  idDocumentUrl: z.string().min(1).max(10_000_000), // can be a data URL (base64 encoded, ~33% larger)
  licenseDocumentUrl: z.string().max(10_000_000).optional().or(z.literal("")),
  fullName: z.string().min(1).max(200),
  documentType: z.enum(DOCUMENT_TYPES),
  documentDescription: z.string().min(10).max(2000),
});

export const submitVerification = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SubmitVerification.parse(d))
  .handler(async ({ data }) => {
    const s = await requireSession();
    if (s.role !== "provider") throw new Error("Providers only");
    if (!data.idDocumentUrl) throw new Error("Please upload an ID document first.");

    await ensureSchema();
    const sql = getSql();

    const notes = `Submitted for manual review. Document type: ${data.documentType}. Name: ${data.fullName}. Description: ${data.documentDescription}`;

    // Always set to pending — admin reviews manually, never auto-reject
    await sql`
      INSERT INTO provider_profiles (
        user_id,
        id_document_url,
        license_document_url,
        verification_status,
        verification_notes
      )
      VALUES (
        ${s.uid},
        ${data.idDocumentUrl},
        ${data.licenseDocumentUrl || null},
        'pending',
        ${notes}
      )
      ON CONFLICT (user_id) DO UPDATE SET
        id_document_url = EXCLUDED.id_document_url,
        license_document_url = EXCLUDED.license_document_url,
        verification_status = 'pending',
        verification_notes = EXCLUDED.verification_notes
    `;

    await sql`
      UPDATE verification_requests
      SET status = 'rejected',
        admin_notes = 'Superseded by a newer provider submission.',
        reviewed_at = NOW()
      WHERE provider_id = ${s.uid} AND status = 'pending'
    `;

    await sql`
      INSERT INTO verification_requests (
        provider_id,
        status,
        full_name,
        document_type,
        document_description,
        id_document_url,
        license_document_url
      )
      VALUES (
        ${s.uid},
        'pending',
        ${data.fullName},
        ${data.documentType},
        ${data.documentDescription},
        ${data.idDocumentUrl},
        ${data.licenseDocumentUrl || null}
      )
    `;

    return { status: "pending", notes };
  });

export const listAppliedJobs = createServerFn({ method: "GET" }).handler(async () => {
  const s = await requireSession();
  if (s.role !== "provider") throw new Error("Providers only");
  await ensureSchema();
  await expireTimedOutJobs();
  const sql = getSql();
  const rows = await sql`
    SELECT
      b.id AS bid_id, b.total AS bid_amount, b.status AS bid_status, b.created_at AS applied_at,
      j.id AS job_id, j.title, j.category, j.status AS job_status,
      u.name AS homeowner_name
    FROM bids b
    JOIN jobs j ON j.id = b.job_id
    JOIN users u ON u.id = j.homeowner_id
    WHERE b.provider_id = ${s.uid}
    ORDER BY b.created_at DESC
  `;
  return rows as Array<{
    bid_id: number;
    bid_amount: number;
    bid_status: string;
    applied_at: string;
    job_id: number;
    title: string;
    category: string;
    job_status: string;
    homeowner_name: string;
  }>;
});

// Admin: list all pending verification providers
export const listPendingVerifications = createServerFn({ method: "GET" }).handler(async () => {
  const s = await requireSession();
  if (s.role !== "admin") throw new Error("Admins only");
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT
      vr.id AS request_id,
      vr.provider_id AS user_id,
      vr.status AS verification_status,
      vr.document_type,
      vr.document_description,
      vr.submitted_at,
      pp.verification_notes,
      vr.id_document_url,
      vr.license_document_url,
      u.name,
      u.email
    FROM verification_requests vr
    JOIN users u ON u.id = vr.provider_id
    LEFT JOIN provider_profiles pp ON pp.user_id = vr.provider_id
    WHERE vr.status = 'pending'
    ORDER BY vr.submitted_at DESC
  `;
  // Attach uploaded documents for each provider
  const results = await Promise.all(
    (rows as PendingVerificationRow[]).map(async (row) => {
      const docs = await sql`
        SELECT id, document_type, original_name, file_url, mime_type, size_bytes, uploaded_at
        FROM uploaded_documents WHERE provider_id = ${row.user_id} ORDER BY uploaded_at DESC
      `;
      return { ...row, documents: docs };
    }),
  );
  return results;
});

const AdminVerify = z.object({
  providerId: z.number().int().positive(),
  decision: z.enum(["verified", "rejected"]),
  notes: z.string().max(1000).optional(),
});

export const adminVerifyProvider = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AdminVerify.parse(d))
  .handler(async ({ data }) => {
    const s = await requireSession();
    if (s.role !== "admin") throw new Error("Admins only");
    await ensureSchema();
    const sql = getSql();
    const notes =
      data.notes ?? (data.decision === "verified" ? "Approved by admin." : "Rejected by admin.");

    await sql`
      UPDATE provider_profiles SET
        verification_status = ${data.decision},
        verification_notes = ${notes}
      WHERE user_id = ${data.providerId}
    `;
    await sql`
      UPDATE verification_requests SET
        status = ${data.decision},
        admin_notes = ${notes},
        reviewed_at = NOW()
      WHERE id = (
        SELECT id FROM verification_requests
        WHERE provider_id = ${data.providerId} AND status = 'pending'
        ORDER BY submitted_at DESC
        LIMIT 1
      )
    `;

    const msg =
      data.decision === "verified"
        ? "Your identity verification has been approved. You are now a verified provider!"
        : `Your identity verification was rejected. Reason: ${notes}`;
    await sql`
      INSERT INTO notifications (user_id, title, body, link)
      VALUES (${data.providerId}, ${data.decision === "verified" ? "Verification Approved ✓" : "Verification Rejected"}, ${msg}, '/provider')
    `;
    return { ok: true };
  });
