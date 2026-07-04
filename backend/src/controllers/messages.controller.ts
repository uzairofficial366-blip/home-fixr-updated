import { Response } from "express";
import { prisma } from "../database/prisma.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { SendMessageSchema } from "../validators/index.js";
import { AuthRequest } from "../middleware/authenticate.js";

const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

async function getConversation(jobId: number, uid: number, role: string, providerId?: number) {
  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { homeownerId: true } });
  if (!job) throw new Error("Job not found");

  let participantProviderId = providerId;
  if (role === "homeowner") {
    if (job.homeownerId !== uid) throw new Error("Only the homeowner can message bidders");
    if (!participantProviderId) throw new Error("Provider is required for this conversation");
  } else if (role === "provider") {
    participantProviderId = uid;
  } else if (role !== "admin") {
    throw new Error("Forbidden");
  }
  if (!participantProviderId) throw new Error("Provider is required");

  const bid = await prisma.bid.findFirst({
    where: { jobId, providerId: participantProviderId, status: "accepted" },
  });
  if (!bid) throw new Error("Live chat opens after the provider accepts and the customer confirms.");

  const conversation = await prisma.conversation.upsert({
    where: { jobId_providerId: { jobId, providerId: participantProviderId } },
    update: {},
    create: { jobId, homeownerId: job.homeownerId, providerId: participantProviderId },
  });

  if (role === "admin" || conversation.homeownerId === uid || conversation.providerId === uid) {
    return conversation;
  }
  throw new Error("Forbidden");
}

export async function listMessages(req: AuthRequest, res: Response) {
  const jobId = parseInt(String(req.params.id || req.params.jobId || req.params.bidId));
  const providerId = (req.query.providerId as string) ? parseInt(req.query.providerId as string) : undefined;
  if (isNaN(jobId)) { sendError(res, "Invalid job ID", 400); return; }

  let conversation;
  try {
    conversation = await getConversation(jobId, req.user!.uid, req.user!.role, providerId);
  } catch (e) { sendError(res, (e as Error).message, 400); return; }

  await prisma.message.updateMany({
    where: { conversationId: conversation.id, receiverId: req.user!.uid, readAt: null },
    data: { readAt: new Date() },
  });

  const rows = await prisma.$queryRaw<unknown[]>`
    SELECT m.*, u.name AS sender_name FROM messages m JOIN users u ON u.id = m.sender_id
    WHERE m.conversation_id = ${conversation.id} ORDER BY m.created_at ASC LIMIT 500
  `;
  sendSuccess(res, rows);
}

export async function sendMessage(req: AuthRequest, res: Response) {
  const jobId = parseInt(String(req.params.id || req.params.jobId || req.params.bidId));
  if (isNaN(jobId)) { sendError(res, "Invalid job ID", 400); return; }

  const parse = SendMessageSchema.safeParse({ ...req.body, jobId });
  if (!parse.success) { sendError(res, parse.error.issues[0]?.message || "Validation error", 422); return; }
  const data = parse.data;

  let conversation;
  try {
    conversation = await getConversation(jobId, req.user!.uid, req.user!.role, data.providerId);
  } catch (e) { sendError(res, (e as Error).message, 400); return; }

  const receiverId = req.user!.uid === conversation.homeownerId ? conversation.providerId : conversation.homeownerId;

  let attachment: { fileUrl: string; fileName: string; mimeType: string; sizeBytes: number } | undefined;
  if (data.attachment) {
    if (!ALLOWED_ATTACHMENT_TYPES.has(data.attachment.mimeType)) {
      sendError(res, "Only JPG, PNG, WebP, PDF, DOC, or DOCX files can be shared.", 400); return;
    }
    const base64Data = data.attachment.fileContentBase64.includes(",") ? data.attachment.fileContentBase64.split(",")[1] : data.attachment.fileContentBase64;
    const sizeBytes = Math.round((base64Data.length * 3) / 4);
    if (sizeBytes === 0) { sendError(res, `${data.attachment.fileName} is empty.`, 400); return; }
    if (sizeBytes > MAX_ATTACHMENT_BYTES) { sendError(res, `${data.attachment.fileName} must be under 3MB.`, 400); return; }
    attachment = {
      fileUrl: data.attachment.fileContentBase64.startsWith("data:") ? data.attachment.fileContentBase64 : `data:${data.attachment.mimeType};base64,${base64Data}`,
      fileName: data.attachment.fileName,
      mimeType: data.attachment.mimeType,
      sizeBytes,
    };
  }

  const message = await prisma.message.create({
    data: {
      jobId,
      conversationId: conversation.id,
      senderId: req.user!.uid,
      receiverId,
      body: data.body?.trim() ?? "",
      attachmentUrl: attachment?.fileUrl ?? null,
      attachmentName: attachment?.fileName ?? null,
      attachmentType: attachment?.mimeType ?? null,
      attachmentSize: attachment?.sizeBytes ?? null,
    },
  });
  await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
  sendSuccess(res, { id: message.id, createdAt: message.createdAt }, 201);
}
