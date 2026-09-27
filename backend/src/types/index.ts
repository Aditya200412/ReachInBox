import { z } from 'zod';

export const CreateCampaignInputSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  recipients: z.array(z.string().email('Invalid email address')).min(1, 'At least one recipient is required'),
  startTime: z.string().datetime({ message: 'Must be a valid ISO date string' }),
  delayBetweenEmails: z.number().min(500, 'Delay must be at least 500ms'),
  hourlyLimit: z.number().min(1).max(10000, 'Hourly limit cannot exceed 10000'),
});

export type CreateCampaignInput = z.infer<typeof CreateCampaignInputSchema>;

export type ParseRecipientsResponse = {
  valid: string[];
  invalid: string[];
  duplicates: string[];
};

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: any;
}

export const EmailSearchQuerySchema = z.object({
  q: z.string().optional(),
  status: z.enum(['SCHEDULED', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED']).optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

export type EmailSearchQuery = z.infer<typeof EmailSearchQuerySchema>;

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
