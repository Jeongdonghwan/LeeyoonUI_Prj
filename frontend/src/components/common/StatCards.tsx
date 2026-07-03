import type { CampaignStats } from '../../types';
import { colors, cardStyle, STATUS_META } from '../../styles/theme';

const CARDS: { key: keyof CampaignStats; label: string; color: string; clickable: boolean; status: string }[] = [
  { key: 'total', label: '전체', color: colors.primary, clickable: true, status: '' },
  { key: 'active', label: '정상', color: STATUS_META.active.dot, clickable: true, status: 'active' },
  { key: 'error', label: '오류', color: STATUS_META.error.dot, clickable: true, status: 'error' },
  { key: 'pending', label: '대기', color: STATUS_META.pending.dot, clickable: true, status: 'pending' },
  { key: 'ending_soon', label: '종료예정', color: STATUS_META.ending_soon.dot, clickable: false, status: '' },
  { key: 'expired', label: '종료', color: STATUS_META.expired.dot, clickable: true, status: 'expired' },
];

interface Props {
  stats: CampaignStats | null;
  activeStatus?: string;
  onSelect?: (status: string) => void;
}

export default function StatCards({ stats, activeStatus = '', onSelect }: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
      {CARDS.map((c) => {
        const isActive = c.key === 'total' ? activeStatus === '' : activeStatus === c.status;
        return (
          <div key={c.key}
            onClick={() => c.clickable && onSelect?.(c.status)}
            style={{
              ...cardStyle, position: 'relative', overflow: 'hidden', padding: '18px 18px 16px',
              cursor: c.clickable ? 'pointer' : 'default',
              borderColor: isActive ? colors.primary : colors.border,
              boxShadow: isActive ? `0 0 0 1px ${colors.primary}` : cardStyle.boxShadow,
            }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: c.color }} />
            <div style={{ fontSize: 13, color: colors.textMuted, fontWeight: 500 }}>{c.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: colors.text, marginTop: 8 }}>
              {stats ? stats[c.key] : 0}<span style={{ fontSize: 13, fontWeight: 500, color: colors.textMuted, marginLeft: 3 }}>개</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
