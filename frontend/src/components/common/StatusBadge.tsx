interface StatusBadgeProps {
  status: 'active' | 'expired' | 'pending' | '등록' | '수정' | '삭제';
}

const badgeStyles: Record<string, React.CSSProperties> = {
  active: { background: '#dcfce7', color: '#166534' },
  expired: { background: '#fee2e2', color: '#991b1b' },
  pending: { background: '#fef3c7', color: '#92400e' },
  '등록': { background: '#dcfce7', color: '#166534' },
  '수정': { background: '#dbeafe', color: '#1e40af' },
  '삭제': { background: '#fee2e2', color: '#991b1b' },
};

const labels: Record<string, string> = {
  active: '활성',
  expired: '만료',
  pending: '대기',
  '등록': '등록',
  '수정': '수정',
  '삭제': '삭제',
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 99,
        fontSize: 12,
        fontWeight: 500,
        ...badgeStyles[status],
      }}
    >
      {labels[status] || status}
    </span>
  );
}
