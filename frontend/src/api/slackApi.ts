import client from './client';
import { SlackStatus, ApiResponse } from '../types';

export const getSlackStatus = (): Promise<ApiResponse<SlackStatus>> => {
  return client.get('/slack/status');
};

export const connectSlack = (): void => {
  window.location.href = '/api/slack/connect';
};

export const disconnectSlack = (): Promise<ApiResponse> => {
  return client.post('/slack/disconnect');
};
