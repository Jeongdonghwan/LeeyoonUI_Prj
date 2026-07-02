export interface User {
  id: number;
  username: string;
  role: 'admin' | 'distributor' | 'user';
  parent_id: number | null;
  parent_username: string | null;
  company: string | null;
  memo: string | null;
  created_at: string;
  total_slots: number;
  used_slots: number;
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

export interface Slot {
  id: number;
  user_id: number;
  status: 'active' | 'expired' | 'pending';
  created_by: number;
  keyword_main: string;
  keyword_compare: string | null;
  product_url: string | null;
  product_id: string | null;
  product_name: string | null;
  compare_url: string | null;
  single_mid: string | null;
  compare_mid: string | null;
  start_date: string | null;
  end_date: string | null;
  quantity: number;
  slot_type: number | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

export interface SlotLog {
  id: number;
  type: '등록' | '수정' | '삭제';
  user_id: number;
  slot_id: number | null;
  modified_by: number | null;
  username?: string;
  modified_by_username?: string;
  quantity: number;
  slot_type: number | null;
  period_days: number;
  daily_total: number;
  created_at: string;
  job_start_date: string | null;
}

export interface SlotChangeDetail {
  id: number;
  log_id: number;
  slot_id: number;
  field_name: string;
  field_label: string;
  old_value: string | null;
  new_value: string | null;
}

export interface PaginationParams {
  page: number;
  per_page: number;
}
