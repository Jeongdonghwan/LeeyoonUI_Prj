import type { CSSProperties } from 'react';

// ============================================================
// 북두칠성 디자인 토큰 — 밝고 뉴트럴한 톤 + 인디고 액센트
// ============================================================
export const colors = {
  bg: '#f4f6fa',
  surface: '#ffffff',
  surfaceAlt: '#f8fafc',
  border: '#e5e7eb',
  borderStrong: '#d1d5db',
  text: '#1f2937',
  textMuted: '#6b7280',
  textFaint: '#9ca3af',
  primary: '#5b6ef5',
  primaryHover: '#4a5ce0',
  primarySoft: '#eef1fe',
  primaryGradient: 'linear-gradient(135deg, #5b6ef5 0%, #8b5cf6 100%)',
  accentViolet: '#8b5cf6',
  danger: '#dc2626',
  dangerSoft: '#fee2e2',
  success: '#16a34a',
  successSoft: '#dcfce7',
  sidebarBg: '#ffffff',
  sidebarText: '#4b5563',
  sidebarActiveBg: '#eef2ff',
  sidebarActiveText: '#4f6ef7',
  tableHead: '#f8fafc',
};

// --------------------------------------------- 역할 메타
export type Role = 'admin' | 'distributor' | 'agency' | 'user';
export const ROLE_META: Record<Role, { label: string; bg: string; fg: string }> = {
  admin:       { label: '관리자', bg: '#ede9fe', fg: '#6d28d9' },
  distributor: { label: '총판',   bg: '#dbeafe', fg: '#1d4ed8' },
  agency:      { label: '대행사', bg: '#cffafe', fg: '#0e7490' },
  user:        { label: '광고주', bg: '#dcfce7', fg: '#166534' },
};

// --------------------------------------------- 상태 메타
export type CampaignStatus = 'pending' | 'active' | 'error' | 'expired';
// 관리자가 수동으로 지정 가능한 상태 (오류 제외)
export const STATUS_SELECT_OPTIONS: { value: CampaignStatus; label: string }[] = [
  { value: 'active', label: '정상' },
  { value: 'pending', label: '대기' },
  { value: 'expired', label: '종료' },
];
export const STATUS_META: Record<string, { label: string; bg: string; fg: string; dot: string }> = {
  active:      { label: '정상',   bg: '#dcfce7', fg: '#166534', dot: '#16a34a' },
  error:       { label: '오류',   bg: '#fee2e2', fg: '#991b1b', dot: '#dc2626' },
  pending:     { label: '대기',   bg: '#fef3c7', fg: '#92400e', dot: '#d97706' },
  ending_soon: { label: '종료예정', bg: '#ffedd5', fg: '#9a3412', dot: '#ea580c' },
  expired:     { label: '종료',   bg: '#f1f5f9', fg: '#475569', dot: '#94a3b8' },
};

// --------------------------------------------- 상품(북두칠성1/2/3) 메타
export type ProductType = 'bdc1' | 'bdc2' | 'bdc3' | 'bdcnav';
export const PRODUCT_META: Record<ProductType, {
  label: string; format: 'A' | 'B'; runTime: string;
  minPeriod: string; minTa: string;
}> = {
  bdc1: { label: '북두칠성1', format: 'A', runTime: '익일 구동', minPeriod: '7일(최소구동일자)', minTa: '100타' },
  bdc2: { label: '북두칠성2', format: 'B', runTime: '익일 구동', minPeriod: '7일(최소구동일자)', minTa: '100타' },
  bdc3: { label: '북두칠성3', format: 'A', runTime: '익일 구동', minPeriod: '7일(최소구동일자)', minTa: '100타' },
  bdcnav: { label: '북두칠성 길찾기', format: 'B', runTime: '익일 구동', minPeriod: '7일(최소구동일자)', minTa: '100타' },
};
export const PRODUCTS: ProductType[] = ['bdc1', 'bdc2', 'bdc3', 'bdcnav'];

// --------------------------------------------- 공유 스타일
export const cardStyle: CSSProperties = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
};

export const btnPrimary: CSSProperties = {
  background: colors.primaryGradient, color: '#fff', border: 'none',
  borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  boxShadow: '0 1px 2px rgba(91,110,245,0.25)',
};
export const btnSecondary: CSSProperties = {
  background: '#fff', color: colors.text, border: `1px solid ${colors.borderStrong}`,
  borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
};
export const btnDanger: CSSProperties = {
  background: '#fff', color: colors.danger, border: `1px solid #fca5a5`,
  borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
};
export const btnGhost: CSSProperties = {
  background: 'transparent', color: colors.textMuted, border: 'none',
  borderRadius: 8, padding: '6px 10px', fontSize: 13, cursor: 'pointer',
};
export const btnSm: CSSProperties = { padding: '4px 10px', fontSize: 12, borderRadius: 6 };

export const inputStyle: CSSProperties = {
  width: '100%', border: `1px solid ${colors.borderStrong}`, borderRadius: 8,
  padding: '8px 12px', fontSize: 14, boxSizing: 'border-box', outline: 'none', background: '#fff',
};
export const labelStyle: CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: colors.text,
};
export const fieldStyle: CSSProperties = { marginBottom: 16 };

export const thStyle: CSSProperties = {
  background: colors.tableHead, color: colors.textMuted, fontSize: 12, fontWeight: 600,
  padding: '11px 14px', textAlign: 'left', borderBottom: `1px solid ${colors.border}`,
  whiteSpace: 'nowrap',
};
export const tdStyle: CSSProperties = {
  padding: '11px 14px', fontSize: 13, color: colors.text,
  borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap',
};

export const badgeBase: CSSProperties = {
  display: 'inline-block', padding: '2px 10px', borderRadius: 999,
  fontSize: 12, fontWeight: 600, lineHeight: 1.6,
};
