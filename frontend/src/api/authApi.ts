import client from './client';
import { User, ApiResponse } from '../types';

export const getMe = (): Promise<ApiResponse<User>> => {
  return client.get('/auth/me');
};

export const logout = (): Promise<ApiResponse> => {
  return client.post('/auth/logout');
};

export const getGoogleAuthUrl = (): string => {
  return '/api/auth/google';
};
