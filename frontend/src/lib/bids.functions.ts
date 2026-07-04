import { bidsService } from "../services/bids.service.js";

export const createBid = async ({ data }: { data: any }) => {
  return bidsService.createBid(data);
};

export const listBidsForJob = async ({ data }: { data: { jobId: number } }) => {
  return bidsService.listBidsForJob(data.jobId);
};

export const acceptBid = async ({ data }: { data: { bidId: number } | any }) => {
  const bidId = typeof data === "object" && "bidId" in data ? data.bidId : data;
  return bidsService.acceptBid(bidId);
};

export const declineBid = async ({ data }: { data: { bidId: number } | any }) => {
  const bidId = typeof data === "object" && "bidId" in data ? data.bidId : data;
  return bidsService.declineBid(bidId);
};
