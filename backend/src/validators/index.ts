import { z } from "zod";

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

export const DOCUMENT_TYPES = [
  "CNIC Front",
  "CNIC Back",
  "Passport",
  "Driving License",
  "Other Government ID",
] as const;

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const SignupSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(6).max(200),
  name: z.string().min(1).max(120),
  role: z.enum(["homeowner", "provider"]),
  phone: z.string().max(40).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
});

// ─── Jobs ─────────────────────────────────────────────────────────────────────
export const JobPhotoSchema = z.object({
  fileName: z.string().min(1).max(200),
  mimeType: z.string().min(1).max(100),
  fileContentBase64: z.string().min(1).max(3_000_000),
});

export const CreateJobSchema = z.object({
  category: z.enum(CATEGORIES),
  title: z.string().min(3).max(160),
  description: z.string().min(10).max(2000),
  address: z.string().min(3).max(300),
  preferredDate: z.string().min(1).max(40),
  preferredTime: z.string().min(1).max(40),
  estimatedHours: z.number().min(0).max(999).optional(),
  estimatedDays: z.number().min(0).max(999).optional(),
  photos: z.array(JobPhotoSchema).max(4).optional(),
  additionalNotes: z.string().max(1000).optional(),
  budget: z.number().positive().max(1_000_000).optional(),
});

export const SuggestPriceSchema = z.object({
  category: z.enum(CATEGORIES),
  title: z.string().min(3).max(200),
  description: z.string().min(5).max(2000),
});

export const BroadcastResponseSchema = z.object({
  broadcastId: z.number().int().positive(),
});

export const BroadcastCustomResponseSchema = BroadcastResponseSchema.extend({
  total: z.number().positive().max(10_000_000),
  message: z.string().max(1000).optional(),
});

// ─── Bids ─────────────────────────────────────────────────────────────────────
export const CreateBidSchema = z.object({
  jobId: z.number().int().positive(),
  hourlyRate: z.number().positive().max(1_000_000),
  hoursEstimate: z.number().positive().max(1000),
  equipmentCost: z.number().min(0).max(10_000_000),
  message: z.string().max(1000).optional(),
});

// ─── Provider ─────────────────────────────────────────────────────────────────
export const UpdateProviderProfileSchema = z.object({
  bio: z.string().max(1000),
  categories: z.array(z.enum(CATEGORIES)).max(5),
  hourlyRate: z.number().min(0).max(1_000_000),
  yearsExperience: z.number().int().min(0).max(80),
  isAvailable: z.boolean(),
  profilePictureUrl: z.string().max(2_000_000).optional(),
});

export const UploadDocumentSchema = z.object({
  fileName: z.string().min(1).max(200),
  mimeType: z.string().min(1).max(100),
  fileContentBase64: z.string().min(1),
  documentType: z.enum(DOCUMENT_TYPES),
});

export const SubmitVerificationSchema = z.object({
  idDocumentUrl: z.string().min(1).max(10_000_000),
  licenseDocumentUrl: z.string().max(10_000_000).optional().or(z.literal("")),
  fullName: z.string().min(1).max(200),
  documentType: z.enum(DOCUMENT_TYPES),
  documentDescription: z.string().min(10).max(2000),
});

// ─── Reviews ─────────────────────────────────────────────────────────────────
export const CreateReviewSchema = z.object({
  jobId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(1).max(1000),
});

// ─── Messages ────────────────────────────────────────────────────────────────
export const MessageAttachmentSchema = z.object({
  fileName: z.string().min(1).max(200),
  mimeType: z.string().min(1).max(120),
  fileContentBase64: z.string().min(1).max(4_500_000),
});

export const SendMessageSchema = z
  .object({
    jobId: z.number().int().positive(),
    providerId: z.number().int().positive().optional(),
    body: z.string().trim().max(2000).optional(),
    attachment: MessageAttachmentSchema.optional(),
  })
  .refine((v) => Boolean(v.body?.trim()) || Boolean(v.attachment), {
    message: "Add a message or attach a file.",
  });

// ─── Admin ────────────────────────────────────────────────────────────────────
export const AdminVerifyProviderSchema = z.object({
  providerId: z.number().int().positive(),
  decision: z.enum(["verified", "rejected"]),
  notes: z.string().max(1000).optional(),
});

export const CreateAdminSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
  name: z.string().min(1).max(120),
});
