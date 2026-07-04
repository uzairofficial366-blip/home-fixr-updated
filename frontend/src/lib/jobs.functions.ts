import { jobsService } from "../services/jobs.service.js";

export const CATEGORIES = [
  "Plumbing",
  "Electrical",
  "Gardening",
  "Carpenter",
  "Painter",
  "Cleaning",
  "AC Technician",
  "Mason",
  "Home Maintenance",
  "Appliance Repair",
  "Pest Control",
  "Other Services",
] as const;

export const createJob = async ({ data }: { data: any }) => {
  return jobsService.createJob(data);
};

export const suggestPrice = async ({ data }: { data: any }) => {
  return jobsService.suggestPrice(data);
};

export const listMyJobs = async () => {
  return jobsService.listMyJobs();
};

export const listOpenJobs = async () => {
  return jobsService.listOpenJobs();
};

export const getJob = async ({ data: { id } }: { data: { id: number } }) => {
  return jobsService.getJob(id);
};

export const getPendingJobBroadcast = async () => {
  return jobsService.getPendingJobBroadcast();
};

export const acceptJobBroadcast = async ({ data: { broadcastId } }: { data: { broadcastId: number } }) => {
  return jobsService.acceptJobBroadcast(broadcastId);
};

export const customizeJobBroadcastPrice = async ({
  data: { broadcastId, total, message },
}: {
  data: { broadcastId: number; total: number; message?: string };
}) => {
  return jobsService.customizeJobBroadcastPrice(broadcastId, total, message);
};

export const rejectJobBroadcast = async ({ data: { broadcastId } }: { data: { broadcastId: number } }) => {
  return jobsService.rejectJobBroadcast(broadcastId);
};

export const requestJobCompletion = async ({ data: { jobId } }: { data: { jobId: number } }) => {
  return jobsService.requestJobCompletion(jobId);
};

export const confirmJobCompletion = async ({ data: { jobId } }: { data: { jobId: number } }) => {
  return jobsService.confirmJobCompletion(jobId);
};
