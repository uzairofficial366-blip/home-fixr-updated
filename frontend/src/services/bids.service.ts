import { apiClient } from "./apiClient.js";

export const bidsService = {
  async createBid(data: { jobId: number; hourlyRate: number; hoursEstimate: number; equipmentCost: number; message?: string }) {
    const res: any = await apiClient.post("/bids", data);
    return res.data;
  },

  async listBidsForJob(jobId: number) {
    const res: any = await apiClient.get(`/bids/job/${jobId}`);
    return res.data;
  },

  async acceptBid(bidId: number) {
    const res: any = await apiClient.post(`/bids/accept/${bidId}`);
    return res.data;
  },

  async declineBid(bidId: number) {
    const res: any = await apiClient.post(`/bids/decline/${bidId}`);
    return res.data;
  },
};
