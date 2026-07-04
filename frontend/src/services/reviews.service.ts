import { apiClient } from "./apiClient.js";

export const reviewsService = {
  async createReview(data: { jobId: number; rating: number; comment: string }) {
    const res: any = await apiClient.post("/reviews", data);
    return res.data;
  },

  async getJobReview(jobId: number) {
    const res: any = await apiClient.get(`/reviews/job/${jobId}`);
    return res.data;
  },
};
