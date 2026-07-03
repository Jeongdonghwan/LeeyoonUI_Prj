import api from './axios';
import type { ApiResponse, CampaignLog, CampaignChangeDetail } from '../types';

export const getLogs = (params?: {
  page?: number; per_page?: number; search?: string; user_id?: number;
  start_date?: string; end_date?: string;
}) => api.get<ApiResponse<{ logs: CampaignLog[]; total: number }>>('/logs/', { params });

export const getLogStats = (params?: {
  search?: string; user_id?: number; start_date?: string; end_date?: string;
}) =>
  api.get<ApiResponse<{ total_count: number; total_ta: number; total_days: number }>>('/logs/stats', { params });

export const exportLogs = (params?: {
  search?: string; user_id?: number; start_date?: string; end_date?: string;
}) =>
  api.get('/logs/excel-export', { params, responseType: 'blob' });

export const getLogDetails = (logId: number) =>
  api.get<ApiResponse<{ log: CampaignLog; details: CampaignChangeDetail[] }>>(`/logs/${logId}/details`);
