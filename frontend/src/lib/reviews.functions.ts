import { reviewsService } from "../services/reviews.service.js";

export const createReview = async ({ data }: { data: any }) => {
  return reviewsService.createReview(data);
};

export const getJobReview = async ({ data }: { data: { jobId: number } | any }) => {
  const jobId = typeof data === "object" && "jobId" in data ? data.jobId : data;
  return reviewsService.getJobReview(jobId);
};
