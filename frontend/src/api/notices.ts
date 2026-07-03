import api from './axios';
import type { ApiResponse, Notice } from '../types';

export const getNotices = (search?: string) =>
  api.get<ApiResponse<{ notices: Notice[] }>>('/notices/', { params: { search } });

export const getNotice = (id: number) =>
  api.get<ApiResponse<Notice>>(`/notices/${id}`);

export const createNotice = (data: { title: string; content: string; pinned: boolean }) =>
  api.post<ApiResponse<{ id: number }>>('/notices/', data);

export const updateNotice = (id: number, data: { title: string; content: string; pinned: boolean }) =>
  api.put<ApiResponse<{ id: number }>>(`/notices/${id}`, data);

export const deleteNotice = (id: number) =>
  api.delete<ApiResponse<null>>(`/notices/${id}`);
