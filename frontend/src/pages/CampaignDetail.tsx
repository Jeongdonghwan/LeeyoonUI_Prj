import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCampaign, getCampaignHistory, approveCampaign } from '../api/campaigns';
import type { Campaign, CampaignHistoryLog } from '../types';
import { useAuthStore } from '../store/authStore';
import { colors, cardStyle, thStyle, tdStyle, btnSecondary, btnPrimary, badgeBase, PRODUCT_META } from '../styles/theme';
import StatusBadge from '../components/common/StatusBadge';
import { IconCheck } from '../components/common/icons';
import toast from 'react-hot-toast';

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAdmin = useAuthStore((s) => s.user?.role) === 'admin';
  const [c, setC] = useState<Campaign | null>(null);
  const [history, setHistory] = useState<CampaignHistoryLog[]>([]);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    getCampaign(Number(id))
      .then((r) => setC(r.data.data))
      .catch((e) => setErr(e.response?.data?.message || '조회 실패'));
    getCampaignHistory(Number(id)).then((r) => setHistory(r.data.data.logs)).catch(() => {});
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async () => {
    if (!c) return;
    await approveCampaign(c.id);
    toast.success('승인되었습니다.');
    load();
  };

  if (err) return <div style={{ color: colors.textMuted }}>{err} <button style={btnSecondary} onClick={() => navigate(-1)}>뒤로</button></div>;
  if (!c) return <div style={{ color: colors.textMuted }}>불러오는 중...</div>;

  const meta = PRODUCT_META[c.product_type];
  const isA = meta.format === 'A';

  const rows: [string, React.ReactNode][] = isA
    ? [
        ['상품', meta.label], ['상태', <StatusBadge status={c.status} />], ['광고주', c.user_username || '-'],
        ['플레이스 업체명', c.place_name || '-'], ['메인키워드', c.keyword_main || '-'],
        ['url (모바일)', c.place_url || '-'], ['구동 시작일', c.start_date || '-'], ['종료일', c.end_date || '-'],
        ['일타수', c.daily_ta ?? '-'], ['구동일수', c.run_days ?? '-'],
        ['총타수', <b style={{ color: colors.danger }}>{(c.total_ta ?? 0).toLocaleString()}</b>],
        ['메모', c.memo || '-'],
      ]
    : [
        ['상품', meta.label], ['상태', <StatusBadge status={c.status} />], ['광고주', c.user_username || '-'],
        ['접수일', c.intake_date || '-'], ['메인키워드', c.keyword_main || '-'], ['업체명', c.place_name || '-'],
        ['플레이스 링크', c.place_url || '-'], ['시작일', c.start_date || '-'], ['만료일', c.end_date || '-'],
        ['총작업량', <b style={{ color: colors.danger }}>{(c.total_ta ?? 0).toLocaleString()}</b>], ['메모', c.memo || '-'],
      ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button style={btnSecondary} onClick={() => navigate(-1)}>← 뒤로</button>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.text }}>캠페인 상세 #{c.id}</h2>
        <span style={{ ...badgeBase, background: colors.primarySoft, color: colors.primary }}>{meta.label}</span>
        <StatusBadge status={c.status} />
        {isAdmin && c.status === 'pending' && (
          <button style={{ ...btnPrimary, marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={handleApprove}>
            <IconCheck size={14} color="#fff" /> 승인
          </button>
        )}
      </div>

      <div style={{ ...cardStyle, padding: 4, marginBottom: 18 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {rows.map(([k, v], i) => (
              <tr key={i}>
                <td style={{ ...tdStyle, width: 160, background: colors.surfaceAlt, fontWeight: 600, color: colors.textMuted }}>{k}</td>
                <td style={{ ...tdStyle, whiteSpace: 'normal', wordBreak: 'break-all' }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isA && (
        <div style={{ ...cardStyle, padding: 18 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: colors.text }}>일자별 작업량</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{(c.days || []).map((d) => <th key={d.day_no} style={thStyle}>D-{d.day_no}</th>)}<th style={thStyle}>합계</th></tr></thead>
            <tbody><tr>
              {(c.days || []).map((d) => <td key={d.day_no} style={{ ...tdStyle, textAlign: 'center' }}>{d.ta.toLocaleString()}</td>)}
              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: colors.danger }}>{(c.total_ta ?? 0).toLocaleString()}</td>
            </tr></tbody>
          </table>
          {(!c.days || c.days.length === 0) && <div style={{ color: colors.textMuted, fontSize: 13, padding: 12 }}>일자별 데이터가 없습니다.</div>}
        </div>
      )}

      {/* 변경 이력 (등록/수정/승인 + 변경 전후) */}
      <div style={{ ...cardStyle, padding: 18, marginTop: 18 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: colors.text }}>변경 이력</h3>
        {history.length === 0 ? (
          <div style={{ color: colors.textMuted, fontSize: 13, padding: 8 }}>이력이 없습니다.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {history.map((log) => (
              <div key={log.id} style={{ borderLeft: `3px solid ${colors.primarySoft}`, paddingLeft: 14 }}>
                <div style={{ fontSize: 13, color: colors.textMuted, marginBottom: 6 }}>
                  <StatusBadge status={log.type} /> <b style={{ color: colors.text }}>{log.modified_by_username || '-'}</b> · {log.created_at}
                </div>
                {log.changes.length > 0 && (
                  <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 620 }}>
                    <thead><tr>{['항목', '변경 전', '변경 후'].map((h) => <th key={h} style={{ ...thStyle, padding: '6px 12px' }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {log.changes.map((d) => (
                        <tr key={d.id}>
                          <td style={{ ...tdStyle, padding: '6px 12px', fontWeight: 600 }}>{d.field_label}</td>
                          <td style={{ ...tdStyle, padding: '6px 12px', color: colors.danger, background: '#fef2f2' }}>{d.old_value || '-'}</td>
                          <td style={{ ...tdStyle, padding: '6px 12px', color: colors.success, background: '#f0fdf4' }}>{d.new_value || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
