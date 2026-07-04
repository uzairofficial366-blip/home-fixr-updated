import { apiClient } from "./apiClient.js";

export const messagesService = {
  async listMessages(jobId: number, providerId?: number) {
    const res: any = await apiClient.get(`/messages/job/${jobId}`, {
      params: { providerId },
    });
    return res.data;
  },

  async sendMessage(jobId: number, body?: string, attachment?: { fileName: string; mimeType: string; fileContentBase64: string }, providerId?: number) {
    const res: any = await apiClient.post(`/messages/job/${jobId}`, {
      body,
      attachment,
      providerId,
    });
    return res.data;
  },
};
