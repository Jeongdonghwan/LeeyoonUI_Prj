import api from './axios';
import type { ApiResponse, Campaign, CampaignStats, ProductType, CampaignHistoryLog } from '../types';

export interface CampaignListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  product_type?: ProductType | '';
  sort?: string;
  order?: string;
}

export const getCampaigns = (params?: CampaignListParams) =>
  api.get<ApiResponse<{ campaigns: Campaign[]; total: number; page: number; per_page: number }>>(
    '/campaigns/', { params });

export const getCampaignStats = (product_type?: ProductType) =>
  api.get<ApiResponse<CampaignStats>>('/campaigns/stats', { params: { product_type } });

export const getCampaign = (id: number) =>
  api.get<ApiResponse<Campaign>>(`/campaigns/${id}`);

export const createCampaign = (data: Partial<Campaign>) =>
  api.post<ApiResponse<{ id: number }>>('/campaigns/', data);

export const updateCampaign = (id: number, data: Partial<Campaign>) =>
  api.put<ApiResponse<{ id: number }>>(`/campaigns/${id}`, data);

export const bulkUpdateCampaigns = (ids: number[], data: Partial<Campaign>) =>
  api.put<ApiResponse<{ updated: number }>>('/campaigns/bulk', { ids, data });

export const deleteCampaign = (id: number) =>
  api.delete<ApiResponse<null>>(`/campaigns/${id}`);

export const approveCampaign = (id: number) =>
  api.put<ApiResponse<{ id: number }>>(`/campaigns/${id}/approve`);

export const setCampaignStatus = (id: number, status: string) =>
  api.put<ApiResponse<{ id: number }>>(`/campaigns/${id}/status`, { status });

export const getCampaignHistory = (id: number) =>
  api.get<ApiResponse<{ logs: CampaignHistoryLog[] }>>(`/campaigns/${id}/history`);

export const uploadCampaignExcel = (file: File, productType: ProductType, userId: number) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('product_type', productType);
  formData.append('user_id', String(userId));
  return api.post<ApiResponse<{ updated: number; errors: { row: number; error: string }[] }>>(
    '/campaigns/excel-upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export const downloadCampaignTemplate = (productType: ProductType) =>
  api.get('/campaigns/excel-template', { params: { product_type: productType }, responseType: 'blob' });

export const exportCampaigns = (productType: ProductType) =>
  api.get('/campaigns/excel-export', { params: { product_type: productType }, responseType: 'blob' });

// 접수 양식(채워진 시트) 다운로드 — ids 또는 product_type+날짜범위
export const exportCampaignsIntake = (body: { ids?: number[]; product_type?: ProductType; start_date?: string; end_date?: string }) =>
  api.post('/campaigns/export-intake', body, { responseType: 'blob' });

// blob 다운로드 헬퍼
export const saveBlob = (data: Blob, filename: string) => {
  const url = window.URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};
