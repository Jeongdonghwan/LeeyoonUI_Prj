import api from './axios';
import type { ApiResponse, ApiKey } from '../types';

export const issueApiKey = (userId: number, label?: string) =>
  api.post<ApiResponse<{ id: number; raw_key: string; key_prefix: string }>>('/api-keys/', {
    user_id: userId,
    label,
  });

export const listApiKeys = (userId: number) =>
  api.get<ApiResponse<ApiKey[]>>('/api-keys/', { params: { user_id: userId } });

export const revokeApiKey = (id: number) =>
  api.delete<ApiResponse<null>>(`/api-keys/${id}`);
