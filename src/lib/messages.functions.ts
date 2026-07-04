import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ensureSchema, getSql } from "./db.server";
import { requireSession } from "./auth.server";

const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MessageAttachment = z.object({
  fileName: z.string().min(1).max(200),
  mimeType: z.string().min(1).max(120),
  fileContentBase64: z.string().min(1).max(4_500_000),
});

async function getConversationForParticipant(
  jobId: number,
  uid: number,
  role: string,
  providerId?: number,
) {
  const sql = getSql();
  const jrows = await sql`SELECT homeowner_id FROM jobs WHERE id = ${jobId}`;
  const j = jrows[0] as { homeowner_id: number } | undefined;
  if (!j) throw new Error("Job not found");

  let participantProviderId = providerId;
  if (role === "homeowner") {
    if (j.homeowner_id !== uid) throw new Error("Only the homeowner can message bidders");
    if (!participantProviderId) throw new Error("Provider is required for this conversation");
  } else if (role === "provider") {
    participantProviderId = uid;
  } else if (role !== "admin") {
    throw new Error("Forbidden");
  }

  if (!participantProviderId) throw new Error("Provider is required for this conversation");
  const brows = await sql`
    SELECT id FROM bids
    WHERE job_id = ${jobId} AND provider_id = ${participantProviderId} AND status = 'accepted'
  `;
  if (brows.length === 0) {
    throw new Error("Live chat opens after the provider accepts and the customer confirms.");
  }

  const crows = await sql`
    INSERT INTO conversations (job_id, homeowner_id, provider_id, updated_at)
    VALUES (${jobId}, ${j.homeowner_id}, ${participantProviderId}, NOW())
    ON CONFLICT (job_id, provider_id) DO UPDATE SET updated_at = conversations.updated_at
    RETURNING id, homeowner_id, provider_id
  `;
  const conversation = crows[0] as { id: number; homeowner_id: number; provider_id: number };
  if (role === "admin" || conversation.homeowner_id === uid || conversation.provider_id === uid) {
    return conversation;
  }
  throw new Error("Forbidden");
}

export const listMessages = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({
        jobId: z.number().int().positive(),
        providerId: z.number().int().positive().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const s = await requireSession();
    await ensureSchema();
    const conversation = await getConversationForParticipant(
      data.jobId,
      s.uid,
      s.role,
      data.providerId,
    );
    const sql = getSql();
    await sql`
      UPDATE messages
      SET read_at = NOW()
      WHERE conversation_id = ${conversation.id}
        AND receiver_id = ${s.uid}
        AND read_at IS NULL
    `;
    const rows = await sql`
      SELECT m.*, u.name AS sender_name FROM messages m JOIN users u ON u.id = m.sender_id
      WHERE m.conversation_id = ${conversation.id} ORDER BY m.created_at ASC LIMIT 500
    `;
    return rows;
  });

export const sendMessage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        jobId: z.number().int().positive(),
        providerId: z.number().int().positive().optional(),
        body: z.string().trim().max(2000).optional(),
        attachment: MessageAttachment.optional(),
      })
      .refine((value) => Boolean(value.body?.trim()) || Boolean(value.attachment), {
        message: "Add a message or attach a file.",
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const s = await requireSession();
    await ensureSchema();
    const conversation = await getConversationForParticipant(
      data.jobId,
      s.uid,
      s.role,
      data.providerId,
    );
    const receiverId =
      s.uid === conversation.homeowner_id ? conversation.provider_id : conversation.homeowner_id;
    const sql = getSql();
    let attachment:
      | {
          fileUrl: string;
          fileName: string;
          mimeType: string;
          sizeBytes: number;
        }
      | undefined;
    if (data.attachment) {
      if (!ALLOWED_ATTACHMENT_TYPES.has(data.attachment.mimeType)) {
        throw new Error("Only JPG, PNG, WebP, PDF, DOC, or DOCX files can be shared.");
      }
      const base64Data = data.attachment.fileContentBase64.includes(",")
        ? data.attachment.fileContentBase64.split(",")[1]
        : data.attachment.fileContentBase64;
      const sizeBytes = Math.round((base64Data.length * 3) / 4);
      if (sizeBytes === 0) throw new Error(`${data.attachment.fileName} is empty.`);
      if (sizeBytes > MAX_ATTACHMENT_BYTES) {
        throw new Error(`${data.attachment.fileName} must be under 3MB.`);
      }
      attachment = {
        fileUrl: data.attachment.fileContentBase64.startsWith("data:")
          ? data.attachment.fileContentBase64
          : `data:${data.attachment.mimeType};base64,${base64Data}`,
        fileName: data.attachment.fileName,
        mimeType: data.attachment.mimeType,
        sizeBytes,
      };
    }
    console.info("message:create", {
      jobId: data.jobId,
      conversationId: conversation.id,
      senderId: s.uid,
      receiverId,
    });
    const rows = await sql`
      INSERT INTO messages (
        job_id,
        conversation_id,
        sender_id,
        receiver_id,
        body,
        attachment_url,
        attachment_name,
        attachment_type,
        attachment_size
      )
      VALUES (
        ${data.jobId},
        ${conversation.id},
        ${s.uid},
        ${receiverId},
        ${data.body?.trim() ?? ""},
        ${attachment?.fileUrl ?? null},
        ${attachment?.fileName ?? null},
        ${attachment?.mimeType ?? null},
        ${attachment?.sizeBytes ?? null}
      )
      RETURNING id, created_at
    `;
    await sql`UPDATE conversations SET updated_at = NOW() WHERE id = ${conversation.id}`;
    return rows[0];
  });
