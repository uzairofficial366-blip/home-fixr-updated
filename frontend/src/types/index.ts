export interface User {
  id: number;
  email: string;
  name: string;
  role: "homeowner" | "provider" | "admin" | "suspended";
  phone: string | null;
  createdAt: string;
}

export interface ProviderProfile {
  userId: number;
  bio: string;
  categories: string[];
  hourlyRate: string | number;
  yearsExperience: number;
  isAvailable: boolean;
  profilePictureUrl: string | null;
  idDocumentUrl: string | null;
  licenseDocumentUrl: string | null;
  verificationStatus: "unverified" | "pending" | "verified" | "rejected";
  verificationNotes: string;
  name: string;
  email: string;
  documents?: UploadedDocument[];
}

export interface Job {
  id: number;
  homeownerId: number;
  category: string;
  title: string;
  description: string;
  address: string;
  preferredDate: string | null;
  preferredTime: string | null;
  estimatedHours: string | number | null;
  estimatedDays: string | number | null;
  additionalNotes: string;
  budget: string | number | null;
  aiSuggestedMin: string | number | null;
  aiSuggestedMax: string | number | null;
  aiReasoning: string | null;
  status: "open" | "in_progress" | "completed" | "cancelled" | "expired";
  acceptedBidId: number | null;
  completionRequestedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  homeowner_name?: string;
  homeowner_email?: string;
  bid_count?: number;
  photos?: JobPhoto[];
}

export interface JobPhoto {
  id: number;
  originalName: string;
  mimeType: string;
  fileUrl: string;
  sizeBytes: number;
}

export interface Bid {
  id: number;
  jobId: number;
  providerId: number;
  hourlyRate: string | number;
  hoursEstimate: string | number;
  equipmentCost: string | number;
  total: string | number;
  message: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  provider_name?: string;
  provider_email?: string;
  verification_status?: string;
  avg_rating?: number;
  review_count?: number;
}

export interface Message {
  id: number;
  jobId: number;
  conversationId: number | null;
  senderId: number;
  receiverId: number | null;
  body: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentType: string | null;
  attachmentSize: number | null;
  readAt: string | null;
  createdAt: string;
  sender_name?: string;
}

export interface Review {
  id: number;
  jobId: number;
  reviewerId: number;
  providerId: number;
  rating: number;
  comment: string;
  createdAt: string;
  reviewer_name?: string;
}

export interface Payment {
  id: number;
  jobId: number;
  amount: string | number;
  status: "pending" | "held" | "released" | "refunded";
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: number;
  userId: number;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface UploadedDocument {
  id: number;
  documentType: string;
  originalName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  job_count?: number;
  createdAt: string;
}

export interface Setting {
  key: string;
  value: string;
  updatedAt: string;
}
