import { useState, useEffect } from 'react';
import { getLogs, getLogStats, getLogDetails } from '../api/logs';
import { saveBlob, exportCampaignsIntake } from '../api/campaigns';
import type { CampaignLog, CampaignChangeDetail } from '../types';
import Pagination from '../components/common/Pagination';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import {
  colors, cardStyle, thStyle, tdStyle, inputStyle, btnPrimary, btnSecondary, btnSm,
  PRODUCT_META, PRODUCTS, type ProductType,
} from '../styles/theme';
import toast from 'react-hot-toast';

export default function LogManage() {
  const [logs, setLogs] = useState<CampaignLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [productType, setProductType] = useState<ProductType | ''>('');
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total_count: 0, total_ta: 0, total_days: 0 });
  const [trigger, setTrigger] = useState(0);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLog, setDetailLog] = useState<CampaignLog | null>(null);
  const [detailChanges, setDetailChanges] = useState<CampaignChangeDetail[]>([]);

  const perPage = 20;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [l, s] = await Promise.all([
          getLogs({ page, per_page: perPage, search: search || undefined, start_date: startDate || undefined, end_date: endDate || undefined, product_type: productType || undefined }),
          getLogStats({ search: search || undefined, start_date: startDate || undefined, end_date: endDate || undefined, product_type: productType || undefined }),
        ]);
        setLogs(l.data.data.logs);
        setTotal(l.data.data.total);
        setStats(s.data.data);
        setSelected([]);
      } catch { toast.error('로그를 불러오지 못했습니다.'); }
      finally { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, trigger]);

  const handleSearch = () => { setPage(1); setTrigger((v) => v + 1); };

  const openDetail = async (logId: number) => {
    setDetailOpen(true); setDetailLog(null); setDetailChanges([]);
    try {
      const res = await getLogDetails(logId);
      setDetailLog(res.data.data.log);
      setDetailChanges(res.data.data.details);
    } catch { toast.error('상세 정보를 불러오지 못했습니다.'); setDetailOpen(false); }
  };

  const toggle = (campaignId: number) => setSelected((p) => p.includes(campaignId) ? p.filter((v) => v !== campaignId) : [...p, campaignId]);
  const selectableIds = Array.from(new Set(logs.filter((l) => l.campaign_id).map((l) => l.campaign_id as number)));
  const toggleAll = () => setSelected(selected.length === selectableIds.length ? [] : selectableIds);

  // blob 응답 에러에서 메시지 추출
  const blobErrMsg = async (e: any) => {
    try { const t = await e?.response?.data?.text?.(); return t ? JSON.parse(t).message : null; } catch { return null; }
  };
  // 선택 로그의 캠페인들을 접수 양식으로 다운로드
  const exportSelected = async () => {
    if (!selected.length) return toast.error('다운로드할 로그를 선택해주세요.');
    try {
      const res = await exportCampaignsIntake({ ids: selected });
      saveBlob(res.data, `접수양식_선택_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) { toast.error((await blobErrMsg(e)) || '다운로드에 실패했습니다.'); }
  };
  // 현재 필터(상품+날짜) 전체를 접수 양식으로 다운로드
  const exportAll = async () => {
    try {
      const res = await exportCampaignsIntake({
        product_type: productType || undefined,
        start_date: startDate || undefined, end_date: endDate || undefined,
      });
      saveBlob(res.data, `접수양식_${productType || '전체'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) { toast.error((await blobErrMsg(e)) || '다운로드에 실패했습니다.'); }
  };

  const totalPages = Math.ceil(total / perPage);
  const fmt = (n: number) => n.toLocaleString();
  const productLabel = (pt: string | null) => pt ? (PRODUCT_META[pt as 'bdc1']?.label || pt) : '-';

  const cards = [
    { label: '전체', value: fmt(stats.total_count) },
    { label: '타수 합계', value: `${fmt(stats.total_ta)} 타` },
    { label: '구동일수 합계', value: `${fmt(stats.total_days)} 일` },
  ];

  return (
    <div>
      <h2 style={styles.h2}>캠페인 로그</h2>
      <p style={styles.sub}>캠페인 등록·수정·삭제 이력을 확인할 수 있습니다.</p>

      <div style={styles.statRow}>
        {cards.map((c) => (
          <div key={c.label} style={{ ...cardStyle, ...styles.statCard }}>
            <div style={styles.statLabel}>{c.label}</div>
            <div style={styles.statValue}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ ...cardStyle, padding: 18 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={productType} onChange={(e) => { setProductType(e.target.value as ProductType | ''); setPage(1); setTrigger((v) => v + 1); }} style={{ ...inputStyle, width: 150 }}>
            <option value="">전체 상품</option>
            {PRODUCTS.map((p) => <option key={p} value={p}>{PRODUCT_META[p].label}</option>)}
          </select>
          <input style={{ ...inputStyle, width: 180 }} placeholder="사용자 아이디 검색" value={search}
            onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
          <input type="date" style={{ ...inputStyle, width: 150 }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <span style={{ color: colors.textMuted }}>~</span>
          <input type="date" style={{ ...inputStyle, width: 150 }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <button onClick={handleSearch} style={btnSecondary}>검색</button>
          <div style={{ flex: 1 }} />
          <button onClick={exportSelected} style={btnSecondary}>선택 접수양식 다운로드{selected.length ? ` (${selected.length})` : ''}</button>
          <button onClick={exportAll} style={btnPrimary}>전체 접수양식 다운로드</button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={{ ...thStyle, width: 34 }}><input type="checkbox" checked={selectableIds.length > 0 && selected.length === selectableIds.length} onChange={toggleAll} /></th>
              {['번호', '구분', '사용자ID', '수정자', '캠페인번호', '상품유형', '총타수', '구동일수', '생성일시', '상세'].map((h) => <th key={h} style={thStyle}>{h}</th>)}
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} style={{ ...tdStyle, textAlign: 'center', padding: 40 }}>로딩 중...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={11} style={{ ...tdStyle, textAlign: 'center', padding: 40, color: colors.textMuted }}>데이터가 없습니다.</td></tr>
              ) : logs.map((log) => (
                <tr key={log.id} style={log.campaign_id && selected.includes(log.campaign_id) ? { background: colors.primarySoft } : undefined}>
                  <td style={tdStyle}>{log.campaign_id ? <input type="checkbox" checked={selected.includes(log.campaign_id)} onChange={() => toggle(log.campaign_id as number)} /> : null}</td>
                  <td style={tdStyle}>{log.id}</td>
                  <td style={tdStyle}><StatusBadge status={log.type} /></td>
                  <td style={tdStyle}>{log.username || log.user_id}</td>
                  <td style={tdStyle}>{log.modified_by_username || '-'}</td>
                  <td style={tdStyle}>{log.campaign_id || '-'}</td>
                  <td style={tdStyle}>{productLabel(log.product_type)}</td>
                  <td style={tdStyle}>{fmt(log.total_ta || 0)}</td>
                  <td style={tdStyle}>{log.period_days || 0}</td>
                  <td style={tdStyle}>{log.created_at}</td>
                  <td style={tdStyle}>{log.type === '수정' ? <button onClick={() => openDetail(log.id)} style={btnSm}>상세보기</button> : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={styles.footer}>
          <span style={{ fontSize: 13, color: colors.textMuted }}>총 {total}건</span>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>

      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title="변경 상세 내역">
        {!detailLog ? (
          <div style={{ textAlign: 'center', padding: 30, color: colors.textMuted }}>로딩 중...</div>
        ) : (
          <>
            <div style={{ marginBottom: 14, fontSize: 13, color: colors.textMuted, lineHeight: 1.8 }}>
              로그 #{detailLog.id} · {detailLog.type} · 캠페인번호 {detailLog.campaign_id || '-'}<br />
              대상 {detailLog.username || detailLog.user_id} · 수정자 {detailLog.modified_by_username || '-'} · {detailLog.created_at}
            </div>
            {detailChanges.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: colors.textFaint }}>변경 상세 내역이 없습니다.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['항목', '변경 전', '변경 후'].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                <tbody>
                  {detailChanges.map((d) => (
                    <tr key={d.id}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{d.field_label}</td>
                      <td style={{ ...tdStyle, color: colors.danger, background: '#fef2f2' }}>{d.old_value || '-'}</td>
                      <td style={{ ...tdStyle, color: colors.success, background: '#f0fdf4' }}>{d.new_value || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  h2: { fontSize: 22, fontWeight: 700, color: colors.text },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 6, marginBottom: 18 },
  statRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 },
  statCard: { padding: '18px 20px' },
  statLabel: { fontSize: 13, color: colors.textMuted },
  statValue: { fontSize: 24, fontWeight: 700, color: colors.text, marginTop: 8 },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
};
