export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

export type CampaignStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface Campaign {
  id: string;
  userId: string;
  subject: string;
  body: string;
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
  totalRecipients: number;
  status: CampaignStatus;
  createdAt: string;
}

export type EmailStatus = 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED' | 'CANCELLED';

export interface Email {
  id: string;
  campaignId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt?: string;
  status: EmailStatus;
  attempts: number;
  providerMessageId?: string;
  previewUrl?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface SlackStatus {
  connected: boolean;
  teamName?: string;
  channelName?: string;
}

export interface ParseResult {
  valid: string[];
  invalid: string[];
  duplicates: string[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
