import { apiClient } from "./apiClient.js";

export const providerService = {
  async getProfile() {
    const res: any = await apiClient.get("/provider/profile");
    return res.data;
  },

  async updateProfile(data: { bio: string; categories: string[]; hourlyRate: number; yearsExperience: number; isAvailable: boolean; profilePictureUrl?: string }) {
    const res: any = await apiClient.post("/provider/profile", data);
    return res.data;
  },

  async uploadDocument(data: { fileName: string; mimeType: string; fileContentBase64: string; documentType: string }) {
    const res: any = await apiClient.post("/provider/document", data);
    return res.data;
  },

  async submitVerification(data: { idDocumentUrl: string; licenseDocumentUrl?: string; fullName: string; documentType: string; documentDescription: string }) {
    const res: any = await apiClient.post("/provider/verification", data);
    return res.data;
  },

  async listAppliedJobs() {
    const res: any = await apiClient.get("/provider/applied");
    return res.data;
  },

  async getPublicProfile(id: number) {
    const res: any = await apiClient.get(`/provider/public/${id}`);
    return res.data;
  },

  async listCommissions() {
    const res: any = await apiClient.get("/provider/commissions");
    return res.data;
  },

  async submitCommissionPayment(commissionId: number, data: { receiptBase64: string; mimeType: string }) {
    const res: any = await apiClient.post(`/provider/commissions/${commissionId}/pay`, data);
    return res.data;
  },
};

