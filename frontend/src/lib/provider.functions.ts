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
