import { useQuery } from '@tanstack/react-query';
import { getScheduledEmails, getSentEmails, searchEmails } from '../api/emailApi';

export const useScheduledEmails = (page: number = 1, limit: number = 10) => {
  return useQuery({
    queryKey: ['emails', 'scheduled', page, limit],
    queryFn: () => getScheduledEmails(page, limit),
  });
};

export const useSentEmails = (page: number = 1, limit: number = 10) => {
  return useQuery({
    queryKey: ['emails', 'sent', page, limit],
    queryFn: () => getSentEmails(page, limit),
  });
};

export const useSearchEmails = (query: string, status?: string, page: number = 1, limit: number = 10) => {
  return useQuery({
    queryKey: ['emails', 'search', query, status, page, limit],
    queryFn: () => searchEmails(query, status, page, limit),
    enabled: !!query,
  });
};


