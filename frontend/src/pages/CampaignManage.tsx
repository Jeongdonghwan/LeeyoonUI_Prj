import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCampaigns, getCampaignStats, setCampaignStatus } from '../api/campaigns';
import type { Campaign, CampaignStats } from '../types';
import { useAuthStore } from '../store/authStore';
import { colors, cardStyle, thStyle, tdStyle, inputStyle, btnPrimary, btnSecondary, badgeBase, PRODUCT_META, STATUS_SELECT_OPTIONS, type ProductType } from '../styles/theme';
import StatusBadge from '../components/common/StatusBadge';
import StatCards from '../components/common/StatCards';
import Pagination from '../components/common/Pagination';
import { IconInbox } from '../components/common/icons';
import { displayStatus } from '../utils/campaignStatus';
import toast from 'react-hot-toast';
import { differenceInCalendarDays, parseISO } from 'date-fns';

function daysLeft(end: string | null) {
  if (!end) return '-';
  const d = differenceInCalendarDays(parseISO(end), new Date()) + 1;
  return d < 0 ? '만료' : `${d}일`;
}

export default function CampaignManage() {
  const navigate = useNavigate();
  const isAdmin = useAuthStore((s) => s.user?.role) === 'admin';
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [rows, setRows] = useState<Campaign[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [productFilter, setProductFilter] = useState<ProductType | ''>('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, list] = await Promise.all([
        getCampaignStats(),
        getCampaigns({ page, per_page: perPage, search, status: statusFilter, product_type: productFilter }),
      ]);
      setStats(s.data.data);
      setRows(list.data.data.campaigns);
      setTotal(list.data.data.total);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, statusFilter, productFilter]);

  useEffect(() => { load(); }, [load]);

  const handleStatus = async (id: number, status: string) => {
    await setCampaignStatus(id, status);
    toast.success('상태가 변경되었습니다.');
    load();
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div>
      <h2 style={styles.h2}>캠페인 관리</h2>
      <p style={styles.sub}>생성된 캠페인의 연장·수정·삭제 등의 작업을 할 수 있습니다.</p>

      <StatCards stats={stats} activeStatus={statusFilter} onSelect={(s) => { setStatusFilter(s); setPage(1); }} />

      {/* 툴바 + 테이블 */}
      <div style={{ ...cardStyle, padding: 18 }}>
        <div style={styles.toolbar}>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={productFilter} onChange={(e) => { setProductFilter(e.target.value as ProductType | ''); setPage(1); }}
              style={{ ...inputStyle, width: 140 }}>
              <option value="">전체 상품</option>
              {(['bdc1', 'bdc2', 'bdc3', 'bdcnav'] as ProductType[]).map((p) => <option key={p} value={p}>{PRODUCT_META[p].label}</option>)}
            </select>
            <input style={{ ...inputStyle, width: 240 }} placeholder="업체명 / 키워드 / 아이디 검색"
              value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); load(); } }} />
            <button style={btnSecondary} onClick={() => { setPage(1); load(); }}>검색</button>
            {(statusFilter || productFilter) && (
              <button style={btnSecondary} onClick={() => { setStatusFilter(''); setProductFilter(''); setSearch(''); setPage(1); }}>초기화</button>
            )}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['번호', '상품', '상태', '아이디', '업체명', '메인키워드', '총타수', '단가', '시작일', '종료일', '남은일수', '등록일'].concat(isAdmin ? ['상태변경'] : []).map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && (
                <tr><td colSpan={13} style={styles.empty}>
                  <div style={{ display: 'flex', justifyContent: 'center', color: colors.textFaint, marginBottom: 10 }}><IconInbox size={40} /></div>
                  아직 생성된 캠페인이 없습니다.
                  <div><button style={{ ...btnPrimary, marginTop: 12 }} onClick={() => navigate('/accounts')}>계정관리로 가기</button></div>
                </td></tr>
              )}
              {rows.map((c) => (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/campaigns/${c.id}`)}>
                  <td style={tdStyle}>{c.id}</td>
                  <td style={tdStyle}><span style={{ ...badgeBase, background: colors.primarySoft, color: colors.primary }}>{PRODUCT_META[c.product_type].label}</span></td>
                  <td style={tdStyle}><StatusBadge status={displayStatus(c.status, c.end_date)} /></td>
                  <td style={tdStyle}>{c.user_username || '-'}</td>
                  <td style={tdStyle}>{c.place_name || <span style={{ color: colors.textFaint }}>미입력</span>}</td>
                  <td style={tdStyle}>{c.keyword_main || '-'}</td>
                  <td style={tdStyle}>{(c.total_ta ?? 0).toLocaleString()}</td>
                  <td style={tdStyle}>{c.unit_price != null ? `${c.unit_price.toLocaleString()}원` : '-'}</td>
                  <td style={tdStyle}>{c.start_date || '-'}</td>
                  <td style={tdStyle}>{c.end_date || '-'}</td>
                  <td style={tdStyle}>{daysLeft(c.end_date)}</td>
                  <td style={tdStyle}>{c.created_at?.slice(0, 10)}</td>
                  {isAdmin && (
                    <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                      <select value={c.status} onChange={(e) => handleStatus(c.id, e.target.value)}
                        style={{ ...inputStyle, width: 78, padding: '4px 6px', fontSize: 12 }} title="상태 변경">
                        {STATUS_SELECT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={styles.footer}>
          <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} style={{ ...inputStyle, width: 110 }}>
            {[20, 50, 100].map((n) => <option key={n} value={n}>{n}개씩</option>)}
          </select>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          <span style={{ fontSize: 13, color: colors.textMuted }}>총 {total}건</span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  h2: { fontSize: 22, fontWeight: 700, color: colors.text },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 6, marginBottom: 20 },
  statRow: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 },
  statCard: { padding: '16px 18px' },
  statLabel: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: colors.textMuted, fontWeight: 500 },
  statValue: { fontSize: 26, fontWeight: 700, color: colors.text, marginTop: 8 },
  statUnit: { fontSize: 13, fontWeight: 500, color: colors.textMuted, marginLeft: 3 },
  toolbar: { display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 },
  table: { width: '100%', borderCollapse: 'collapse' },
  empty: { textAlign: 'center', padding: '60px 0', color: colors.textMuted, fontSize: 14 },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
};
