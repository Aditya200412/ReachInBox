import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSlackStatus, disconnectSlack } from '../api/slackApi';

export const useSlackStatus = () => {
  return useQuery({
    queryKey: ['slack', 'status'],
    queryFn: getSlackStatus,
  });
};

export const useDisconnectSlack = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: disconnectSlack,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slack', 'status'] });
    },
  });
};
