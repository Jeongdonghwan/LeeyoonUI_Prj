import { useState, useEffect } from 'react';
import { getLogs, getLogStats, exportLogs, getLogDetails } from '../api/logs';
import type { SlotLog, SlotChangeDetail } from '../types';
import Pagination from '../components/common/Pagination';
import toast from 'react-hot-toast';

export default function LogManage() {
  const [logs, setLogs] = useState<(SlotLog & { username?: string })[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total_count: 0, total_quantity: 0, total_ta: 0 });
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [detailModal, setDetailModal] = useState(false);
  const [detailLog, setDetailLog] = useState<(SlotLog & { username?: string }) | null>(null);
  const [detailChanges, setDetailChanges] = useState<SlotChangeDetail[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const perPage = 20;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await getLogs({
        page,
        per_page: perPage,
        search: search || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setLogs(res.data.data.logs);
      setTotal(res.data.data.total);
    } catch {
      toast.error('로그 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await getLogStats({
        search: search || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setStats(res.data.data);
    } catch { /* ignore */ }
  };

  const openDetail = async (logId: number) => {
    setDetailLoading(true);
    setDetailModal(true);
    try {
      const res = await getLogDetails(logId);
      setDetailLog(res.data.data.log);
      setDetailChanges(res.data.data.details);
    } catch {
      toast.error('상세 정보를 불러오지 못했습니다.');
      setDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchTrigger]);

  const handleSearch = () => {
    setPage(1);
    setSearchTrigger((v) => v + 1);
  };

  const handleExport = async () => {
    try {
      const res = await exportLogs({
        search: search || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('엑셀 다운로드에 실패했습니다.');
    }
  };

  const totalPages = Math.ceil(total / perPage);

  const formatNumber = (n: number) => n.toLocaleString();

  const typeBadge = (type: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      '등록': { bg: '#dcfce7', color: '#166534' },
      '수정': { bg: '#dbeafe', color: '#1e40af' },
      '삭제': { bg: '#fee2e2', color: '#991b1b' },
    };
    const s = map[type] || { bg: '#f3f4f6', color: '#374151' };
    return (
      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: 12, fontWeight: 500, background: s.bg, color: s.color }}>
        {type}
      </span>
    );
  };

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>로그관리</h2>

      {/* 통계 카드 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <div style={statCard}>
          <div style={statLabel}>전체</div>
          <div style={statValue}>{formatNumber(stats.total_count)}</div>
        </div>
        <div style={statCard}>
          <div style={statLabel}>슬롯 합계</div>
          <div style={statValue}>{formatNumber(stats.total_quantity)}</div>
        </div>
        <div style={statCard}>
          <div style={statLabel}>타 합계</div>
          <div style={statValue}>{formatNumber(stats.total_ta)} 타</div>
        </div>
      </div>

      {/* 검색 + 필터 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          style={inputStyle}
          placeholder="사용자 아이디 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <input
          type="date"
          style={dateStyle}
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <span style={{ color: '#6b7280' }}>~</span>
        <input
          type="date"
          style={dateStyle}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
        <button onClick={handleSearch} style={btnSecondary}>검색</button>
        <button onClick={handleExport} style={btnPrimary}>엑셀 다운로드</button>
      </div>

      {/* 테이블 */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8 }}>
          <thead>
            <tr>
              {['번호', '구분', '사용자ID', '수정자', '슬롯번호', '슬롯타입', '수량', '타수', '생성일시', '상세'].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ ...tdStyle, textAlign: 'center' }}>로딩 중...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={10} style={{ ...tdStyle, textAlign: 'center' }}>데이터가 없습니다.</td></tr>
            ) : (
              logs.map((log) => {
                const slotType = log.slot_type ?? 100;
                const ta = (log.quantity || 0) * slotType;
                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={tdStyle}>{log.id}</td>
                    <td style={tdStyle}>{typeBadge(log.type)}</td>
                    <td style={tdStyle}>{log.username || log.user_id}</td>
                    <td style={tdStyle}>{log.modified_by_username || '-'}</td>
                    <td style={tdStyle}>{log.slot_id || '-'}</td>
                    <td style={tdStyle}>{slotType}</td>
                    <td style={tdStyle}>{log.quantity}</td>
                    <td style={tdStyle}>{formatNumber(ta)}</td>
                    <td style={tdStyle}>{log.created_at}</td>
                    <td style={tdStyle}>
                      {log.type === '수정' ? (
                        <button onClick={() => openDetail(log.id)} style={btnDetail}>상세보기</button>
                      ) : '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* 상세보기 모달 */}
      {detailModal && (
        <div style={overlayStyle} onClick={() => setDetailModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>변경 상세 내역</h3>
              <button onClick={() => setDetailModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>&times;</button>
            </div>

            {detailLoading ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>로딩 중...</div>
            ) : (
              <>
                {detailLog && (
                  <div style={{ marginBottom: 16, fontSize: 13, color: '#6b7280', lineHeight: 1.8 }}>
                    로그 #{detailLog.id} | {detailLog.type} | 슬롯번호: {detailLog.slot_id || '-'}<br />
                    대상유저: {detailLog.username || detailLog.user_id} | 수정자: {detailLog.modified_by_username || '-'} | {detailLog.created_at}
                  </div>
                )}
                {detailChanges.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>변경 상세 내역이 없습니다.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={detailThStyle}>항목</th>
                        <th style={detailThStyle}>변경 전</th>
                        <th style={detailThStyle}>변경 후</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailChanges.map((d) => (
                        <tr key={d.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ ...detailTdStyle, fontWeight: 500 }}>{d.field_label}</td>
                          <td style={{ ...detailTdStyle, color: '#dc2626', background: '#fef2f2' }}>{d.old_value || '-'}</td>
                          <td style={{ ...detailTdStyle, color: '#16a34a', background: '#f0fdf4' }}>{d.new_value || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { background: '#1a2744', color: '#fff', fontSize: 13, fontWeight: 500, padding: '12px 16px', textAlign: 'left' };
const tdStyle: React.CSSProperties = { padding: '10px 16px', fontSize: 13 };
const inputStyle: React.CSSProperties = { border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 12px', fontSize: 14, width: 220, boxSizing: 'border-box' };
const dateStyle: React.CSSProperties = { border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' };
const btnSecondary: React.CSSProperties = { background: '#fff', border: '1px solid #d1d5db', color: '#374151', borderRadius: 6, padding: '7px 16px', fontSize: 13, cursor: 'pointer' };
const btnPrimary: React.CSSProperties = { background: '#8B1A2E', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 13, cursor: 'pointer' };
const statCard: React.CSSProperties = { flex: 1, background: '#fff', borderRadius: 8, padding: '16px 20px', textAlign: 'center' };
const statLabel: React.CSSProperties = { fontSize: 13, color: '#6b7280', marginBottom: 4 };
const statValue: React.CSSProperties = { fontSize: 24, fontWeight: 700, color: '#111827' };
const btnDetail: React.CSSProperties = { background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, padding: '3px 10px', fontSize: 12, cursor: 'pointer', color: '#374151' };
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalStyle: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 28, minWidth: 500, maxWidth: 640, maxHeight: '80vh', overflowY: 'auto' };
const detailThStyle: React.CSSProperties = { background: '#f9fafb', padding: '10px 14px', fontSize: 13, fontWeight: 600, textAlign: 'left', borderBottom: '2px solid #e5e7eb' };
const detailTdStyle: React.CSSProperties = { padding: '10px 14px', fontSize: 13 };
