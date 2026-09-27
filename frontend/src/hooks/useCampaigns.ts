import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCampaigns, getCampaign, createCampaign } from '../api/campaignApi';

export const useCampaigns = () => {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: getCampaigns,
  });
};

export const useCampaign = (id: string) => {
  return useQuery({
    queryKey: ['campaign', id],
    queryFn: () => getCampaign(id),
    enabled: !!id,
  });
};

export const useCreateCampaign = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['emails', 'scheduled'] });
    },
  });
};
