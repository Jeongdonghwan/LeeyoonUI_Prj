import api from './axios';
import type { ApiResponse, Slot } from '../types';

export const getSlots = (params?: {
  page?: number; per_page?: number; search?: string;
  status?: string; sort?: string; order?: string;
}) => api.get<ApiResponse<{ slots: Slot[]; total: number; page: number; per_page: number }>>('/slots/', { params });

export const createSlot = (data: Partial<Slot>) =>
  api.post<ApiResponse<{ id: number }>>('/slots/', data);

export const updateSlot = (id: number, data: Partial<Slot>) =>
  api.put<ApiResponse<{ id: number }>>(`/slots/${id}`, data);

export const bulkUpdateSlots = (ids: number[], data: Partial<Slot>) =>
  api.put<ApiResponse<{ updated: number }>>('/slots/bulk', { ids, data });

export const deleteSlot = (id: number) =>
  api.delete<ApiResponse<null>>(`/slots/${id}`);

export const uploadExcel = (file: File, userId?: number) => {
  const formData = new FormData();
  formData.append('file', file);
  if (userId) formData.append('user_id', String(userId));
  return api.post<ApiResponse<{ created: number; errors: any[] }>>('/slots/excel-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const downloadTemplate = () =>
  api.get('/slots/excel-template', { responseType: 'blob' });

export const exportSlots = () =>
  api.get('/slots/excel-export', { responseType: 'blob' });
