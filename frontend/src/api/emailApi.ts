import client from './client';
import { Email, PaginatedResponse, ApiResponse, ParseResult } from '../types';

export const getScheduledEmails = (page: number = 1, limit: number = 10): Promise<ApiResponse<PaginatedResponse<Email>>> => {
  return client.get('/emails/scheduled', { params: { page, limit } });
};

export const getSentEmails = (page: number = 1, limit: number = 10): Promise<ApiResponse<PaginatedResponse<Email>>> => {
  return client.get('/emails/sent', { params: { page, limit } });
};

export const searchEmails = (q: string, status?: string, page: number = 1, limit: number = 10): Promise<ApiResponse<PaginatedResponse<Email>>> => {
  const params: any = { q, page, limit };
  if (status) params.status = status;
  return client.get('/emails/search', { params });
};

export const parseRecipients = (file: File): Promise<ApiResponse<ParseResult>> => {
  const formData = new FormData();
  formData.append('file', file);
  return client.post('/emails/parse-recipients', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};


