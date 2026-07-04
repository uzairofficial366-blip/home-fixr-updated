import { apiClient } from "./apiClient.js";

export const jobsService = {
  async suggestPrice(data: { category: string; title: string; description: string }) {
    const res: any = await apiClient.post("/jobs/suggest-price", data);
    return res.data;
  },

  async createJob(data: any) {
    const res: any = await apiClient.post("/jobs", data);
    return res.data;
  },

  async listMyJobs() {
    const res: any = await apiClient.get("/jobs/my");
    return res.data;
  },

  async listOpenJobs() {
    const res: any = await apiClient.get("/jobs/open");
    return res.data;
  },

  async getJob(id: number) {
    const res: any = await apiClient.get(`/jobs/${id}`);
    return res.data;
  },

  async getPendingJobBroadcast() {
    const res: any = await apiClient.get("/jobs/broadcast/pending");
    return res.data;
  },

  async acceptJobBroadcast(broadcastId: number) {
    const res: any = await apiClient.post("/jobs/broadcast/accept", { broadcastId });
    return res.data;
  },

  async customizeJobBroadcastPrice(broadcastId: number, total: number, message?: string) {
    const res: any = await apiClient.post("/jobs/broadcast/customize", { broadcastId, total, message });
    return res.data;
  },

  async rejectJobBroadcast(broadcastId: number) {
    const res: any = await apiClient.post("/jobs/broadcast/reject", { broadcastId });
    return res.data;
  },

  async requestJobCompletion(jobId: number) {
    const res: any = await apiClient.post("/jobs/request-completion", { jobId });
    return res.data;
  },

  async confirmJobCompletion(jobId: number) {
    const res: any = await apiClient.post("/jobs/confirm-completion", { jobId });
    return res.data;
  },
};
