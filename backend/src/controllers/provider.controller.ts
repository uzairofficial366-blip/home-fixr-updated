import { Response } from "express";
import { prisma } from "../database/prisma.js";
import { sendSuccess, sendError } from "../utils/response.js";
import {
  UpdateProviderProfileSchema,
  UploadDocumentSchema,
  SubmitVerificationSchema,
} from "../validators/index.js";
import { AuthRequest } from "../middleware/authenticate.js";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export async function getProviderProfile(req: AuthRequest, res: Response) {
  if (req.user!.role !== "provider") { sendError(res, "Providers only", 403); return; }

  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT pp.*, u.name, u.email
    FROM provider_profiles pp JOIN users u ON u.id = pp.user_id WHERE pp.user_id = ${req.user!.uid}
  `;
  const profile = rows[0];
  if (!profile) { sendSuccess(res, null); return; }

  const docs = await prisma.uploadedDocument.findMany({
    where: { providerId: req.user!.uid },
    orderBy: { uploadedAt: "desc" },
    select: { id: true, documentType: true, originalName: true, fileUrl: true, mimeType: true, sizeBytes: true, uploadedAt: true },
  });
  sendSuccess(res, { ...profile, documents: docs });
}

export async function updateProviderProfile(req: AuthRequest, res: Response) {
  if (req.user!.role !== "provider") { sendError(res, "Providers only", 403); return; }

  const parse = UpdateProviderProfileSchema.safeParse(req.body);
  if (!parse.success) { sendError(res, parse.error.issues[0]?.message || "Validation error", 422); return; }
  const data = parse.data;

  await prisma.providerProfile.upsert({
    where: { userId: req.user!.uid },
    update: {
      bio: data.bio,
      categories: data.categories,
      hourlyRate: data.hourlyRate,
      yearsExperience: data.yearsExperience,
      isAvailable: data.isAvailable,
      profilePictureUrl: data.profilePictureUrl ?? null,
    },
    create: {
      userId: req.user!.uid,
      bio: data.bio,
      categories: data.categories,
      hourlyRate: data.hourlyRate,
      yearsExperience: data.yearsExperience,
      isAvailable: data.isAvailable,
      profilePictureUrl: data.profilePictureUrl ?? null,
    },
  });
  sendSuccess(res, { ok: true });
}

export async function uploadVerificationDocument(req: AuthRequest, res: Response) {
  if (req.user!.role !== "provider") { sendError(res, "Providers only", 403); return; }

  const parse = UploadDocumentSchema.safeParse(req.body);
  if (!parse.success) { sendError(res, parse.error.issues[0]?.message || "Validation error", 422); return; }
  const data = parse.data;

  if (!ALLOWED_MIME_TYPES.has(data.mimeType)) { sendError(res, "Only JPG, PNG, WebP, or PDF files are allowed.", 400); return; }

  const base64Data = data.fileContentBase64.includes(",") ? data.fileContentBase64.split(",")[1] : data.fileContentBase64;
  const sizeBytes = Math.round((base64Data.length * 3) / 4);
  if (sizeBytes > MAX_FILE_BYTES) { sendError(res, "File must be under 5MB.", 400); return; }
  if (sizeBytes === 0) { sendError(res, "File is empty.", 400); return; }

  const fileUrl = data.fileContentBase64.startsWith("data:") ? data.fileContentBase64 : `data:${data.mimeType};base64,${base64Data}`;

  await prisma.uploadedDocument.create({
    data: {
      providerId: req.user!.uid,
      documentType: data.documentType,
      originalName: data.fileName,
      storedName: data.fileName,
      mimeType: data.mimeType,
      fileUrl,
      sizeBytes,
    },
  });
  await prisma.providerProfile.upsert({
    where: { userId: req.user!.uid },
    update: { idDocumentUrl: fileUrl },
    create: { userId: req.user!.uid, idDocumentUrl: fileUrl },
  });

  sendSuccess(res, { fileUrl, documentType: data.documentType, originalName: data.fileName, mimeType: data.mimeType, sizeBytes }, 201);
}

export async function submitVerification(req: AuthRequest, res: Response) {
  if (req.user!.role !== "provider") { sendError(res, "Providers only", 403); return; }

  const parse = SubmitVerificationSchema.safeParse(req.body);
  if (!parse.success) { sendError(res, parse.error.issues[0]?.message || "Validation error", 422); return; }
  const data = parse.data;

  if (!data.idDocumentUrl) { sendError(res, "Please upload an ID document first.", 400); return; }

  const notes = `Submitted for manual review. Document type: ${data.documentType}. Name: ${data.fullName}. Description: ${data.documentDescription}`;

  await prisma.providerProfile.upsert({
    where: { userId: req.user!.uid },
    update: { idDocumentUrl: data.idDocumentUrl, licenseDocumentUrl: data.licenseDocumentUrl || null, verificationStatus: "pending", verificationNotes: notes },
    create: { userId: req.user!.uid, idDocumentUrl: data.idDocumentUrl, licenseDocumentUrl: data.licenseDocumentUrl || null, verificationStatus: "pending", verificationNotes: notes },
  });

  await prisma.verificationRequest.updateMany({
    where: { providerId: req.user!.uid, status: "pending" },
    data: { status: "rejected", adminNotes: "Superseded by a newer provider submission.", reviewedAt: new Date() },
  });

  await prisma.verificationRequest.create({
    data: {
      providerId: req.user!.uid,
      status: "pending",
      fullName: data.fullName,
      documentType: data.documentType,
      documentDescription: data.documentDescription,
      idDocumentUrl: data.idDocumentUrl,
      licenseDocumentUrl: data.licenseDocumentUrl || null,
    },
  });

  sendSuccess(res, { status: "pending", notes });
}

export async function listAppliedJobs(req: AuthRequest, res: Response) {
  if (req.user!.role !== "provider") { sendError(res, "Providers only", 403); return; }

  const rows = await prisma.$queryRaw<unknown[]>`
    SELECT b.id AS bid_id, b.total AS bid_amount, b.status AS bid_status, b.created_at AS applied_at,
      j.id AS job_id, j.title, j.category, j.status AS job_status, u.name AS homeowner_name
    FROM bids b
    JOIN jobs j ON j.id = b.job_id
    JOIN users u ON u.id = j.homeowner_id
    WHERE b.provider_id = ${req.user!.uid}
    ORDER BY b.created_at DESC
  `;
  sendSuccess(res, rows);
}

export async function getPublicProviderProfile(req: AuthRequest, res: Response) {
  const id = parseInt(String(req.params.id || req.params.jobId || req.params.bidId));
  if (isNaN(id)) { sendError(res, "Invalid provider ID", 400); return; }

  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT pp.user_id AS id, u.name, pp.bio, pp.categories, pp.hourly_rate,
      pp.years_experience, pp.is_available, pp.profile_picture_url, pp.verification_status,
      ROUND(pp.hourly_rate * 8, 2) AS daily_rate,
      COALESCE((SELECT AVG(rating)::float FROM reviews r WHERE r.provider_id = pp.user_id), 0) AS avg_rating,
      (SELECT COUNT(*)::int FROM reviews r WHERE r.provider_id = pp.user_id) AS review_count,
      (SELECT COUNT(*)::int FROM jobs j JOIN bids b ON b.id = j.accepted_bid_id WHERE b.provider_id = pp.user_id AND j.status = 'completed') AS completed_jobs
    FROM provider_profiles pp JOIN users u ON u.id = pp.user_id WHERE pp.user_id = ${id}
  `;
  if (!rows[0]) { sendError(res, "Provider not found", 404); return; }

  const reviews = await prisma.$queryRaw<unknown[]>`
    SELECT r.rating, r.comment, r.created_at, u.name AS reviewer_name
    FROM reviews r JOIN users u ON u.id = r.reviewer_id
    WHERE r.provider_id = ${id} ORDER BY r.created_at DESC LIMIT 20
  `;
  sendSuccess(res, { profile: rows[0], reviews });
}
