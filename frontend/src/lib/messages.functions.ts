import { messagesService } from "../services/messages.service.js";

export const listMessages = async ({ data }: { data: { jobId: number; providerId?: number } | any }) => {
  const jobId = typeof data === "object" && "jobId" in data ? data.jobId : data;
  const providerId = typeof data === "object" && "providerId" in data ? data.providerId : undefined;
  return messagesService.listMessages(jobId, providerId);
};

export const sendMessage = async ({ data }: { data: { jobId: number; body?: string; attachment?: any; providerId?: number } }) => {
  return messagesService.sendMessage(data.jobId, data.body, data.attachment, data.providerId);
};
