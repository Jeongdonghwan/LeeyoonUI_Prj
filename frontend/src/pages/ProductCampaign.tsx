import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getCampaigns, getCampaign, getCampaignStats, createCampaign, updateCampaign, bulkUpdateCampaigns,
  deleteCampaign, approveCampaign, downloadCampaignTemplate, exportCampaigns, uploadCampaignExcel, saveBlob,
} from '../api/campaigns';
import { getUsers } from '../api/users';
import type { Campaign, CampaignStats, User } from '../types';
import { useAuthStore } from '../store/authStore';
import {
  colors, cardStyle, thStyle, tdStyle, inputStyle, labelStyle, fieldStyle,
  btnPrimary, btnSecondary, btnDanger, PRODUCT_META, type ProductType,
} from '../styles/theme';
import StatusBadge from '../components/common/StatusBadge';
import StatCards from '../components/common/StatCards';
import Pagination from '../components/common/Pagination';
import Modal from '../components/common/Modal';
import { IconCheck, IconPlus } from '../components/common/icons';
import { displayStatus, hasIncompleteJamo, isValidPlaceUrl } from '../utils/campaignStatus';

const MIN_RUN_DAYS = 7;
const EMPTY_DAYS = Array.from({ length: MIN_RUN_DAYS }, (_, i) => ({ day_no: i + 1, ta: '' as number | '' }));
const DAILY_TA_OPTIONS = Array.from({ length: 20 }, (_, i) => (i + 1) * 100); // 100 ~ 2000 (100 단위)

function addDays(dateStr: string, n: number) {
  if (!dateStr || !n) return '';
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function ProductCampaign() {
  const { productType } = useParams<{ productType: string }>();
  const pt = (['bdc1', 'bdc2', 'bdc3', 'bdcnav'].includes(productType || '') ? productType : 'bdc1') as ProductType;
  const meta = PRODUCT_META[pt];
  const isA = meta.format === 'A';
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canManage = user?.role === 'admin' || user?.role === 'distributor';  // 삭제·일괄·소유자선택
  const isAdmin = user?.role === 'admin';                                     // 승인
  const isLeaf = user?.role === 'agency' || user?.role === 'user';            // 광고주·대행사(본인 것만)

  const [rows, setRows] = useState<Campaign[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const perPage = 50;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [owners, setOwners] = useState<User[]>([]);
  const [selected, setSelected] = useState<number[]>([]);

  const [regOpen, setRegOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadUser, setUploadUser] = useState<number | ''>('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    place_name: '', keyword_main: '', place_url: '',
    start_date: '', daily_ta: '' as number | '', run_days: '' as number | '', end_date: '',
  });

  // 셀렉트에 현재 값이 목록에 없으면 포함시켜 보존
  const withValue = (opts: number[], v: number) => (opts.includes(v) || !v ? opts : [...opts, v].sort((a, b) => a - b));

  const blankForm = () => ({
    user_id: '' as number | '',
    place_name: '', keyword_main: '', place_url: '',
    intake_date: '', start_date: '', end_date: '',
    daily_ta: 100 as number, run_days: 7 as number,
    days: EMPTY_DAYS.map((d) => ({ ...d })),
    memo: '',
  });
  const [form, setForm] = useState(blankForm());

  const load = useCallback(async () => {
    const [res, s] = await Promise.all([
      getCampaigns({ page, per_page: perPage, search, product_type: pt, status: statusFilter }),
      getCampaignStats(pt),
    ]);
    setRows(res.data.data.campaigns);
    setTotal(res.data.data.total);
    setStats(s.data.data);
    setSelected([]);
  }, [page, search, pt, statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (canManage) getUsers({ per_page: 500 }).then((r) =>
      setOwners(r.data.data.users.filter((u) => u.role === 'user' || u.role === 'agency')));
  }, [canManage]);

  // 구동일수 변경: B형은 일자별 입력칸(D-1~D-N)을 함께 늘리고 줄인다
  const setRunDays = (n: number) => setForm((f) => {
    if (isA) return { ...f, run_days: n };
    const len = Math.max(1, n || 0);
    const days = Array.from({ length: len }, (_, i) => f.days[i] || { day_no: i + 1, ta: '' as number | '' });
    return { ...f, run_days: n, days };
  });

  const totalTa = useMemo(() => {
    if (isA) return (Number(form.daily_ta) || 0) * (Number(form.run_days) || 0);
    return form.days.reduce((s, d) => s + (Number(d.ta) || 0), 0);
  }, [isA, form]);

  const openReg = () => { setForm({ ...blankForm(), user_id: isLeaf ? (user?.id ?? '') : '' }); setEditId(null); setRegOpen(true); };
  const closeReg = () => { setRegOpen(false); setEditId(null); };

  const openEdit = async (c: Campaign) => {
    const res = await getCampaign(c.id);
    const d = res.data.data;
    const dayMap = new Map((d.days || []).map((x) => [x.day_no, x.ta]));
    setForm({
      user_id: d.user_id,
      place_name: d.place_name || '', keyword_main: d.keyword_main || '', place_url: d.place_url || '',
      intake_date: d.intake_date || '', start_date: d.start_date || '', end_date: d.end_date || '',
      daily_ta: d.daily_ta ?? 100, run_days: isA ? (d.run_days ?? MIN_RUN_DAYS) : MIN_RUN_DAYS,
      days: EMPTY_DAYS.map((x) => ({ day_no: x.day_no, ta: (dayMap.get(x.day_no) ?? '') as number | '' })),
      memo: d.memo || '',
    });
    setEditId(c.id);
    setRegOpen(true);
  };

  // 등록 입력 검증 (자음/모음 오타 + 플레이스 URL)
  const validateContent = (keyword: string, url: string): boolean => {
    if (keyword && hasIncompleteJamo(keyword)) {
      toast.error('메인키워드에 자음/모음만 입력되었습니다. 오타를 확인해주세요.');
      return false;
    }
    if (url && !isValidPlaceUrl(url)) {
      toast.error('URL은 https://m.place.naver.com/ 형식이어야 합니다. 다시 입력해주세요.');
      return false;
    }
    return true;
  };

  const submitReg = async () => {
    if (!form.user_id) return toast.error('광고주를 선택해주세요.');
    if (!form.place_name && !form.keyword_main) return toast.error('업체명/메인키워드를 입력해주세요.');
    if (!validateContent(form.keyword_main, form.place_url)) return;
    // 북두칠성2(일자별)는 7일 고정, 북두칠성1·3은 최소 7일(1일 단위)
    const runDays = isA ? (Number(form.run_days) || 0) : MIN_RUN_DAYS;
    if (isA && runDays < MIN_RUN_DAYS) return toast.error(`구동일수는 최소 ${MIN_RUN_DAYS}일 이상이어야 합니다.`);
    // 북두칠성2: 일자별 작업량은 각 100타 이상
    if (!isA && form.days.some((d) => (Number(d.ta) || 0) < 100)) {
      return toast.error('일자별 작업량은 각 100타 이상 입력해주세요.');
    }

    const base: Partial<Campaign> = {
      user_id: Number(form.user_id), product_type: pt,
      place_name: form.place_name, keyword_main: form.keyword_main,
      place_url: form.place_url, memo: form.memo,
    };
    let payload: any = base;
    if (isA) {
      payload = {
        ...base, start_date: form.start_date || null,
        daily_ta: Number(form.daily_ta), run_days: runDays,
        end_date: form.start_date ? addDays(form.start_date, runDays) : null,
      };
    } else {
      payload = {
        ...base, intake_date: form.intake_date || null,
        start_date: form.start_date || null,
        end_date: form.start_date ? addDays(form.start_date, runDays) : null,
        run_days: runDays,
        days: form.days.filter((d) => Number(d.ta) > 0).map((d) => ({ day_no: d.day_no, ta: Number(d.ta) })),
      };
    }
    try {
      if (editId) {
        await updateCampaign(editId, payload);
        toast.success('캠페인이 수정되었습니다. (재승인 대기)');
      } else {
        await createCampaign(payload);
        toast.success('캠페인이 등록되었습니다. (승인 대기)');
      }
      closeReg();
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || (editId ? '수정 실패' : '등록 실패'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('이 캠페인을 삭제할까요?')) return;
    await deleteCampaign(id);
    toast.success('삭제되었습니다.');
    load();
  };
  const handleApprove = async (id: number) => {
    await approveCampaign(id);
    toast.success('승인되었습니다.');
    load();
  };

  // ---- 일괄 작업
  const toggle = (id: number) => setSelected((p) => p.includes(id) ? p.filter((v) => v !== id) : [...p, id]);
  const toggleAll = () => setSelected(selected.length === rows.length ? [] : rows.map((r) => r.id));

  const bulkApprove = async () => {
    const targets = rows.filter((r) => selected.includes(r.id) && r.status === 'pending').map((r) => r.id);
    if (!targets.length) return toast.error('승인할 대기 캠페인이 없습니다.');
    if (!confirm(`${targets.length}건을 일괄 승인할까요?`)) return;
    await Promise.all(targets.map((id) => approveCampaign(id)));
    toast.success(`${targets.length}건 승인 완료`);
    load();
  };
  const bulkDelete = async () => {
    if (!selected.length) return;
    if (!confirm(`${selected.length}건을 일괄 삭제할까요?`)) return;
    await Promise.all(selected.map((id) => deleteCampaign(id)));
    toast.success(`${selected.length}건 삭제 완료`);
    load();
  };
  const openBulkEdit = () => {
    setBulkForm({ place_name: '', keyword_main: '', place_url: '', start_date: '', daily_ta: '', run_days: '', end_date: '' });
    setBulkOpen(true);
  };
  const submitBulkEdit = async () => {
    if (!validateContent(bulkForm.keyword_main, bulkForm.place_url)) return;
    if (bulkForm.run_days && Number(bulkForm.run_days) < MIN_RUN_DAYS) return toast.error(`구동일수는 최소 ${MIN_RUN_DAYS}일 이상이어야 합니다.`);
    const data: any = {};
    if (bulkForm.place_name) data.place_name = bulkForm.place_name;
    if (bulkForm.keyword_main) data.keyword_main = bulkForm.keyword_main;
    if (bulkForm.place_url) data.place_url = bulkForm.place_url;
    if (bulkForm.start_date) data.start_date = bulkForm.start_date;
    if (isA) {
      if (bulkForm.daily_ta) data.daily_ta = Number(bulkForm.daily_ta);
      if (bulkForm.run_days) data.run_days = Number(bulkForm.run_days);
      if (bulkForm.start_date && bulkForm.run_days) data.end_date = addDays(bulkForm.start_date, Number(bulkForm.run_days));
    } else if (bulkForm.end_date) {
      data.end_date = bulkForm.end_date;
    }
    if (!Object.keys(data).length) return toast.error('변경할 항목을 입력해주세요.');
    await bulkUpdateCampaigns(selected, data);
    toast.success(`${selected.length}건 수정 완료 (재승인 대기)`);
    setBulkOpen(false);
    load();
  };

  const handleTemplate = async () => { const res = await downloadCampaignTemplate(pt); saveBlob(res.data, `${meta.label}_양식.xlsx`); };
  const handleExport = async () => { const res = await exportCampaigns(pt); saveBlob(res.data, `${meta.label}_목록.xlsx`); };
  const submitUpload = async () => {
    const targetUser = isLeaf ? user?.id : (uploadUser || null);
    if (!targetUser) return toast.error('광고주를 선택해주세요.');
    if (!uploadFile) return toast.error('엑셀 파일을 선택해주세요.');
    try {
      const res = await uploadCampaignExcel(uploadFile, pt, Number(targetUser));
      const { updated, errors } = res.data.data;
      toast.success(`${updated}건 등록 완료${errors.length ? `, ${errors.length}건 실패` : ''}`);
      setUploadOpen(false); setUploadFile(null); setUploadUser('');
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || '업로드 실패'); }
  };

  const totalPages = Math.ceil(total / perPage);
  const colCount = (isA ? 11 : 10) + 1 + (canManage ? 1 : 0);

  return (
    <div>
      <h2 style={styles.h2}>{meta.label}</h2>

      <StatCards stats={stats} activeStatus={statusFilter} onSelect={(s) => { setStatusFilter(s); setPage(1); }} />

      <div style={{ ...cardStyle, ...styles.infoBox }}>
        {[['최소기간', meta.minPeriod], ['최소 일타수', meta.minTa], ['구동시간', meta.runTime], ['환불/AS', '환불 불가 · A/S 불가']].map(([k, v]) => (
          <div key={k} style={styles.infoItem}><span style={styles.infoKey}>{k}</span><span style={styles.infoVal}>{v}</span></div>
        ))}
      </div>

      <div style={{ ...cardStyle, padding: 18 }}>
        <div style={styles.toolbar}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ ...inputStyle, width: 240 }} placeholder="업체명 / 키워드 / 아이디 검색"
              value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); load(); } }} />
            <button style={btnSecondary} onClick={() => { setPage(1); load(); }}>검색</button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btnSecondary} onClick={handleTemplate}>엑셀 양식</button>
            <button style={btnSecondary} onClick={handleExport}>엑셀 다운로드</button>
            <button style={btnSecondary} onClick={() => setUploadOpen(true)}>엑셀 업로드</button>
            <button style={{ ...btnPrimary, display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={openReg}><IconPlus size={13} color="#fff" /> 캠페인 등록</button>
          </div>
        </div>

        {/* 일괄 작업 바 */}
        {canManage && selected.length > 0 && (
          <div style={styles.bulkBar}>
            <span style={{ fontSize: 13, fontWeight: 600, color: colors.primary }}>{selected.length}건 선택</span>
            {isAdmin && <button style={{ ...btnPrimary, padding: '6px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={bulkApprove}><IconCheck size={12} color="#fff" /> 일괄 승인</button>}
            <button style={{ ...btnSecondary, padding: '6px 12px', fontSize: 12 }} onClick={openBulkEdit}>일괄 수정</button>
            <button style={{ ...btnDanger, padding: '6px 12px', fontSize: 12 }} onClick={bulkDelete}>일괄 삭제</button>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead><tr>
              {canManage && <th style={{ ...thStyle, width: 36 }}><input type="checkbox" checked={rows.length > 0 && selected.length === rows.length} onChange={toggleAll} /></th>}
              {(isA
                ? ['번호', '상태', '아이디', '구동시작일', '업체명', '메인키워드', 'URL', '일타수', '구동일수', '총타수', '종료일']
                : ['번호', '상태', '아이디', '접수일', '메인키워드', '업체명', '링크', '시작일', '만료일', '총작업량']
              ).concat(['관리']).map((h) => <th key={h} style={thStyle}>{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={colCount} style={styles.empty}>등록된 캠페인이 없습니다.</td></tr>
              )}
              {rows.map((c) => (
                <tr key={c.id} style={selected.includes(c.id) ? { background: colors.primarySoft } : undefined}>
                  {canManage && <td style={tdStyle}><input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} /></td>}
                  <td style={linkTd} onClick={() => navigate(`/campaigns/${c.id}`)}>{c.id}</td>
                  <td style={tdStyle}><StatusBadge status={displayStatus(c.status, c.end_date)} /></td>
                  <td style={tdStyle}>{c.user_username || '-'}</td>
                  {isA ? (
                    <>
                      <td style={tdStyle}>{c.start_date || '-'}</td>
                      <td style={tdStyle}>{c.place_name || <span style={faint}>미입력</span>}</td>
                      <td style={tdStyle}>{c.keyword_main || '-'}</td>
                      <td style={{ ...tdStyle, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.place_url || '-'}</td>
                      <td style={tdStyle}>{c.daily_ta ?? '-'}</td>
                      <td style={tdStyle}>{c.run_days ?? '-'}</td>
                      <td style={{ ...tdStyle, color: colors.danger, fontWeight: 600 }}>{(c.total_ta ?? 0).toLocaleString()}</td>
                      <td style={tdStyle}>{c.end_date || '-'}</td>
                    </>
                  ) : (
                    <>
                      <td style={tdStyle}>{c.intake_date || '-'}</td>
                      <td style={tdStyle}>{c.keyword_main || '-'}</td>
                      <td style={tdStyle}>{c.place_name || <span style={faint}>미입력</span>}</td>
                      <td style={{ ...tdStyle, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.place_url || '-'}</td>
                      <td style={tdStyle}>{c.start_date || '-'}</td>
                      <td style={tdStyle}>{c.end_date || '-'}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{(c.total_ta ?? 0).toLocaleString()}</td>
                    </>
                  )}
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {isAdmin && c.status === 'pending' && (
                        <button style={{ ...btnPrimary, padding: '3px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => handleApprove(c.id)}>
                          <IconCheck size={12} color="#fff" /> 승인
                        </button>
                      )}
                      <button style={{ ...btnSecondary, padding: '3px 10px', fontSize: 12 }} onClick={() => openEdit(c)}>수정</button>
                      {canManage && <button style={{ ...btnDanger, padding: '3px 10px', fontSize: 12 }} onClick={() => handleDelete(c.id)}>삭제</button>}
                    </div>
                  </td>
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

      {/* 등록/수정 모달 */}
      <Modal open={regOpen} onClose={closeReg} title={`${meta.label} 캠페인 ${editId ? '수정' : '등록'}`}>
        {canManage && (
          <div style={fieldStyle}>
            <label style={labelStyle}>광고주 <span style={{ color: colors.danger }}>*</span></label>
            <select style={{ ...inputStyle, background: editId ? colors.surfaceAlt : '#fff' }} value={form.user_id} disabled={!!editId}
              onChange={(e) => setForm({ ...form, user_id: e.target.value ? Number(e.target.value) : '' })}>
              <option value="">광고주 선택</option>
              {owners.map((o) => <option key={o.id} value={o.id}>{o.username} ({o.company || o.role})</option>)}
            </select>
          </div>
        )}

        {isA ? (
          <>
            <Row>
              <Field label="구동 시작일"><input type="date" style={inputStyle} value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></Field>
              <Field label="플레이스 업체명"><input style={inputStyle} value={form.place_name} onChange={(e) => setForm({ ...form, place_name: e.target.value })} /></Field>
            </Row>
            <Field label="메인키워드"><input style={inputStyle} value={form.keyword_main} onChange={(e) => setForm({ ...form, keyword_main: e.target.value })} placeholder="완성된 단어로 입력 (자음/모음만 입력 시 오타)" /></Field>
            <Field label="url (모바일)"><input style={inputStyle} value={form.place_url} onChange={(e) => setForm({ ...form, place_url: e.target.value })} placeholder="https://m.place.naver.com/..." /></Field>
            <Row>
              <Field label="일타수 (100 단위)">
                <select style={inputStyle} value={form.daily_ta} onChange={(e) => setForm({ ...form, daily_ta: Number(e.target.value) })}>
                  {withValue(DAILY_TA_OPTIONS, Number(form.daily_ta)).map((v) => <option key={v} value={v}>{v.toLocaleString()}타</option>)}
                </select>
              </Field>
              <Field label="구동일수 (최소 7일, 1일 단위)">
                <input type="number" min={MIN_RUN_DAYS} step={1} style={inputStyle} value={form.run_days}
                  onChange={(e) => setRunDays(e.target.value ? Number(e.target.value) : 0)} />
              </Field>
            </Row>
          </>
        ) : (
          <>
            <Row>
              <Field label="접수일"><input type="date" style={inputStyle} value={form.intake_date} onChange={(e) => setForm({ ...form, intake_date: e.target.value })} /></Field>
              <Field label="업체명"><input style={inputStyle} value={form.place_name} onChange={(e) => setForm({ ...form, place_name: e.target.value })} /></Field>
            </Row>
            <Field label="메인키워드"><input style={inputStyle} value={form.keyword_main} onChange={(e) => setForm({ ...form, keyword_main: e.target.value })} placeholder="완성된 단어로 입력" /></Field>
            <Field label="플레이스 링크"><input style={inputStyle} value={form.place_url} onChange={(e) => setForm({ ...form, place_url: e.target.value })} placeholder="https://m.place.naver.com/..." /></Field>
            <Field label="시작일"><input type="date" style={inputStyle} value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></Field>
            <Field label="일자별 작업량 (D-1 ~ D-7, 매일 다르게 입력 가능)">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                {form.days.map((d, i) => (
                  <div key={d.day_no} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 3 }}>D-{d.day_no}</div>
                    <input type="number" min={100} step={10} placeholder="100+" style={{ ...inputStyle, padding: '6px 4px', textAlign: 'center' }} value={d.ta}
                      onChange={(e) => { const days = [...form.days]; days[i] = { ...d, ta: e.target.value ? Number(e.target.value) : '' }; setForm({ ...form, days }); }} />
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 6 }}>※ 북두칠성2는 7일 고정이며, 만료일은 시작일 + 7일로 자동 설정됩니다.</div>
            </Field>
          </>
        )}

        <div style={styles.totalBox}>{isA ? '총타수' : '총작업량'}: <b style={{ color: colors.danger }}>{totalTa.toLocaleString()}</b> 타</div>

        <div style={styles.modalFooter}>
          <button style={btnSecondary} onClick={closeReg}>취소</button>
          <button style={btnPrimary} onClick={submitReg}>{editId ? '수정' : '등록'}</button>
        </div>
      </Modal>

      {/* 일괄 수정 모달 */}
      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title={`일괄 수정 (${selected.length}건)`}>
        <p style={{ fontSize: 13, color: colors.textMuted, marginBottom: 14 }}>입력한 항목만 선택된 캠페인 전체에 적용됩니다. (수정 후 재승인 필요)</p>
        <Row>
          <Field label="업체명"><input style={inputStyle} value={bulkForm.place_name} onChange={(e) => setBulkForm({ ...bulkForm, place_name: e.target.value })} placeholder="변경 안함" /></Field>
          <Field label="메인키워드"><input style={inputStyle} value={bulkForm.keyword_main} onChange={(e) => setBulkForm({ ...bulkForm, keyword_main: e.target.value })} placeholder="변경 안함" /></Field>
        </Row>
        <Field label="url (모바일)"><input style={inputStyle} value={bulkForm.place_url} onChange={(e) => setBulkForm({ ...bulkForm, place_url: e.target.value })} placeholder="변경 안함 (https://m.place.naver.com/...)" /></Field>
        <Field label="구동 시작일"><input type="date" style={inputStyle} value={bulkForm.start_date} onChange={(e) => setBulkForm({ ...bulkForm, start_date: e.target.value })} /></Field>
        {isA ? (
          <Row>
            <Field label="일타수 (100 단위)">
              <select style={inputStyle} value={bulkForm.daily_ta} onChange={(e) => setBulkForm({ ...bulkForm, daily_ta: e.target.value ? Number(e.target.value) : '' })}>
                <option value="">변경 안함</option>
                {DAILY_TA_OPTIONS.map((v) => <option key={v} value={v}>{v.toLocaleString()}타</option>)}
              </select>
            </Field>
            <Field label="구동일수 (최소 7일)">
              <input type="number" min={MIN_RUN_DAYS} step={1} style={inputStyle} placeholder="변경 안함" value={bulkForm.run_days}
                onChange={(e) => setBulkForm({ ...bulkForm, run_days: e.target.value ? Number(e.target.value) : '' })} />
            </Field>
          </Row>
        ) : (
          <Field label="만료일"><input type="date" style={inputStyle} value={bulkForm.end_date} onChange={(e) => setBulkForm({ ...bulkForm, end_date: e.target.value })} /></Field>
        )}
        <div style={styles.modalFooter}>
          <button style={btnSecondary} onClick={() => setBulkOpen(false)}>취소</button>
          <button style={btnPrimary} onClick={submitBulkEdit}>일괄 수정</button>
        </div>
      </Modal>

      {/* 업로드 모달 */}
      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title={`${meta.label} 엑셀 업로드`}>
        {canManage && (
          <div style={fieldStyle}>
            <label style={labelStyle}>광고주 <span style={{ color: colors.danger }}>*</span></label>
            <select style={inputStyle} value={uploadUser} onChange={(e) => setUploadUser(e.target.value ? Number(e.target.value) : '')}>
              <option value="">광고주 선택</option>
              {owners.map((o) => <option key={o.id} value={o.id}>{o.username} ({o.company || o.role})</option>)}
            </select>
          </div>
        )}
        <div style={fieldStyle}>
          <label style={labelStyle}>엑셀 파일 ({meta.label} 양식)</label>
          <input type="file" accept=".xlsx,.xls" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
          <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 8 }}>※ [엑셀 양식] 버튼으로 받은 양식에 맞춰 작성해주세요.</div>
        </div>
        <div style={styles.modalFooter}>
          <button style={btnSecondary} onClick={() => setUploadOpen(false)}>취소</button>
          <button style={btnPrimary} onClick={submitUpload}>업로드</button>
        </div>
      </Modal>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={fieldStyle}><label style={labelStyle}>{label}</label>{children}</div>;
}

const faint: React.CSSProperties = { color: colors.textFaint };
const linkTd: React.CSSProperties = { ...tdStyle, color: colors.primary, cursor: 'pointer', fontWeight: 600 };

const styles: Record<string, React.CSSProperties> = {
  h2: { fontSize: 22, fontWeight: 700, color: colors.text, marginBottom: 16 },
  infoBox: { display: 'flex', gap: 28, padding: '14px 20px', marginBottom: 18, flexWrap: 'wrap' },
  infoItem: { display: 'flex', flexDirection: 'column', gap: 3 },
  infoKey: { fontSize: 11, color: colors.textMuted },
  infoVal: { fontSize: 13, fontWeight: 600, color: colors.text },
  toolbar: { display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 },
  bulkBar: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', marginBottom: 12, background: colors.primarySoft, borderRadius: 8 },
  table: { width: '100%', borderCollapse: 'collapse' },
  empty: { textAlign: 'center', padding: '50px 0', color: colors.textMuted, fontSize: 14 },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  totalBox: { background: colors.surfaceAlt, borderRadius: 8, padding: '12px 16px', fontSize: 14, marginTop: 4, marginBottom: 4 },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 22 },
};
