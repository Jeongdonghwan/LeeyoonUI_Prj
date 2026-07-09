import api from './axios';
import type { ApiResponse, User, ProductType } from '../types';

export const getUsers = (params?: { search?: string; page?: number; per_page?: number }) =>
  api.get<ApiResponse<{ users: User[]; total: number }>>('/users/', { params });

export const createUser = (data: {
  username: string;
  password: string;
  role: string;
  company?: string;
  memo?: string;
}) => api.post<ApiResponse<User>>('/users/', data);

export const updateUser = (id: number, data: {
  password?: string;
  role?: string;
  company?: string;
  memo?: string;
  prices?: Record<string, number>;
}) => api.put<ApiResponse<User>>(`/users/${id}`, data);

export const deleteUser = (id: number) =>
  api.delete<ApiResponse<null>>(`/users/${id}`);

export const addCampaignQuantity = (id: number, data: {
  quantity: number;
  product_type?: ProductType;
  start_date?: string;
  end_date?: string;
}) => api.post<ApiResponse<null>>(`/users/${id}/add-campaign`, data);
