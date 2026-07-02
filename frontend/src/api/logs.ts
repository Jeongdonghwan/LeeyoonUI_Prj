import api from './axios';
import type { ApiResponse, SlotLog, SlotChangeDetail } from '../types';

export const getLogs = (params?: {
  page?: number; per_page?: number; search?: string; user_id?: number;
  start_date?: string; end_date?: string;
}) => api.get<ApiResponse<{ logs: (SlotLog & { username?: string })[]; total: number }>>('/logs/', { params });

export const getLogStats = (params?: {
  search?: string; user_id?: number; start_date?: string; end_date?: string;
}) =>
  api.get<ApiResponse<{ total_count: number; total_quantity: number; total_ta: number }>>('/logs/stats', { params });

export const exportLogs = (params?: {
  search?: string; user_id?: number; start_date?: string; end_date?: string;
}) =>
  api.get('/logs/excel-export', { params, responseType: 'blob' });

export const getLogDetails = (logId: number) =>
  api.get<ApiResponse<{ log: SlotLog & { username?: string }; details: SlotChangeDetail[] }>>(`/logs/${logId}/details`);
