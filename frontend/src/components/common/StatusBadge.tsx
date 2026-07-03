import { STATUS_META, badgeBase } from '../../styles/theme';

const LOG_META: Record<string, { label: string; bg: string; fg: string }> = {
  '등록': { label: '등록', bg: '#dcfce7', fg: '#166534' },
  '수정': { label: '수정', bg: '#dbeafe', fg: '#1e40af' },
  '삭제': { label: '삭제', bg: '#fee2e2', fg: '#991b1b' },
};

export default function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] || LOG_META[status] || { label: status, bg: '#f1f5f9', fg: '#475569' };
  return (
    <span style={{ ...badgeBase, background: meta.bg, color: meta.fg }}>{meta.label}</span>
  );
}
