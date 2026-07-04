import { apiClient } from "./apiClient.js";

export const paymentsService = {
  async getPayment(jobId: number) {
    const res: any = await apiClient.get(`/payments/job/${jobId}`);
    return res.data;
  },

  async holdPayment(jobId: number) {
    const res: any = await apiClient.post("/payments/hold", { jobId });
    return res.data;
  },

  async releasePayment(jobId: number) {
    const res: any = await apiClient.post("/payments/release", { jobId });
    return res.data;
  },
};
