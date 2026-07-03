export type Role = 'admin' | 'distributor' | 'agency' | 'user';
export type ProductType = 'bdc1' | 'bdc2' | 'bdc3';
export type CampaignStatus = 'pending' | 'active' | 'error' | 'expired';

export interface User {
  id: number;
  username: string;
  role: Role;
  parent_id: number | null;
  parent_username: string | null;
  company: string | null;
  memo: string | null;
  created_at: string;
  sub_distributor: number;
  sub_agency: number;
  sub_user: number;
  campaign_total: number;
  campaign_used: number;
}

export interface LoginResponse {
  success: boolean;
  data: {
    access_token: string;
    user: Pick<User, 'id' | 'username' | 'role' | 'company'>;
  };
  message: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message: string;
}

export interface ApiError {
  error: string;
  message: string;
}

export interface CampaignDay {
  id?: number;
  campaign_id?: number;
  day_no: number;
  ta: number;
}

export interface Campaign {
  id: number;
  user_id: number;
  created_by: number;
  product_type: ProductType;
  status: CampaignStatus;
  place_name: string | null;
  keyword_main: string | null;
  place_url: string | null;
  intake_date: string | null;
  start_date: string | null;
  end_date: string | null;
  daily_ta: number | null;
  run_days: number | null;
  total_ta: number | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
  // join 컬럼
  user_username?: string;
  creator_username?: string;
  days?: CampaignDay[];
}

export interface CampaignStats {
  total: number;
  active: number;
  error: number;
  pending: number;
  ending_soon: number;
  expired: number;
}

export interface CampaignLog {
  id: number;
  type: '등록' | '수정' | '삭제';
  user_id: number;
  campaign_id: number | null;
  modified_by: number | null;
  product_type: ProductType | null;
  total_ta: number;
  period_days: number;
  username?: string;
  modified_by_username?: string;
  created_at: string;
  job_start_date: string | null;
}

export interface CampaignChangeDetail {
  id: number;
  log_id: number;
  campaign_id: number;
  field_name: string;
  field_label: string;
  old_value: string | null;
  new_value: string | null;
}

export interface CampaignHistoryLog extends CampaignLog {
  changes: CampaignChangeDetail[];
}

export interface Notice {
  id: number;
  title: string;
  content: string | null;
  pinned: number;
  created_by: number | null;
  author: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginationParams {
  page: number;
  per_page: number;
}
