import { providerService } from "../services/provider.service.js";

export const getProviderProfile = async () => {
  return providerService.getProfile();
};

export const updateProviderProfile = async ({ data }: { data: any }) => {
  return providerService.updateProfile(data);
};

export const uploadVerificationDocument = async ({ data }: { data: any }) => {
  return providerService.uploadDocument(data);
};

export const submitVerification = async ({ data }: { data: any }) => {
  return providerService.submitVerification(data);
};

export const listAppliedJobs = async () => {
  return providerService.listAppliedJobs();
};

export const getPublicProviderProfile = async ({ data }: { data: { id: number } | any }) => {
  const id = typeof data === "object" && "id" in data ? data.id : data;
  return providerService.getPublicProfile(id);
};

export const listProviderCommissions = async () => {
  return providerService.listCommissions();
};

export const submitCommissionPayment = async ({ data }: { data: { commissionId: number; receiptBase64: string; mimeType: string } }) => {
  return providerService.submitCommissionPayment(data.commissionId, { receiptBase64: data.receiptBase64, mimeType: data.mimeType });
};

