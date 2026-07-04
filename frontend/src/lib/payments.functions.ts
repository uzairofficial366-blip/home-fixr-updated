import { paymentsService } from "../services/payments.service.js";

export const getPayment = async ({ data }: { data: { jobId: number } | any }) => {
  const jobId = typeof data === "object" && "jobId" in data ? data.jobId : data;
  return paymentsService.getPayment(jobId);
};

export const holdPayment = async ({ data }: { data: { jobId: number } | any }) => {
  const jobId = typeof data === "object" && "jobId" in data ? data.jobId : data;
  return paymentsService.holdPayment(jobId);
};

export const releasePayment = async ({ data }: { data: { jobId: number } | any }) => {
  const jobId = typeof data === "object" && "jobId" in data ? data.jobId : data;
  return paymentsService.releasePayment(jobId);
};
