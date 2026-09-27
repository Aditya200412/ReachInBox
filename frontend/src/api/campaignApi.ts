import client from './client';
import { Campaign, ApiResponse } from '../types';

export const createCampaign = (data: Partial<Campaign>): Promise<ApiResponse<Campaign>> => {
  return client.post('/campaigns', data);
};

export const getCampaigns = (): Promise<ApiResponse<Campaign[]>> => {
  return client.get('/campaigns');
};

export const getCampaign = (id: string): Promise<ApiResponse<Campaign>> => {
  return client.get(`/campaigns/${id}`);
};
