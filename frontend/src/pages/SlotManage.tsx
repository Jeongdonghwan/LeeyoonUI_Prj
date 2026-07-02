import { useState, useEffect } from 'react';
import { getSlots, deleteSlot, updateSlot, bulkUpdateSlots } from '../api/slots';
import { useAuthStore } from '../store/authStore';
import type { Slot } from '../types';
import Modal from '../components/common/Modal';
import Pagination from '../components/common/Pagination';
import StatusBadge from '../components/common/StatusBadge';
import toast from 'react-hot-toast';
import { differenceInDays, parseISO } from 'date-fns';

export default function SlotManage() {
  const currentUser = useAuthStore((s) => s.user);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState('DESC');
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  // 수정 모달
  const [editOpen, setEditOpen] = useState(false);
  const [editSlot, setEditSlot] = useState<Partial<Slot>>({});
  const [editId, setEditId] = useState(0);
  const [editKeywords, setEditKeywords] = useState<string[]>(['', '', '', '', '']);

  // 일괄수정 모달
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkData, setBulkData] = useState<Partial<Slot>>({});
  const [bulkKeywords, setBulkKeywords] = useState<string[]>(['', '', '', '', '']);

  const fetchSlots = async () => {
    setLoading(true);
    try {
      const res = await getSlots({ page, per_page: perPage, search: search || undefined, sort, order });
      setSlots(res.data.data.slots);
      setTotal(res.data.data.total);
    } catch {
      toast.error('슬롯 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSlots(); }, [page, perPage, sort, order]);

  const handleSearch = () => { setPage(1); fetchSlots(); };

  const getRemainingDays = (endDate: string | null) => {
    if (!endDate) return '-';
    const diff = differenceInDays(parseISO(endDate), new Date()) + 1;
    return diff <= 0 ? '만료' : `${diff}일`;
  };

  const openEdit = (slot: any) => {
    setEditId(slot.id);
    setEditSlot({
      keyword_main: slot.keyword_main,
      single_mid: slot.single_mid,
      compare_mid: slot.compare_mid,
      product_url: slot.product_url,
      product_id: slot.product_id,
      product_name: slot.product_name,
      compare_url: slot.compare_url,
      start_date: slot.start_date,
      end_date: slot.end_date,
      memo: slot.memo,
      status: slot.status,
      slot_type: slot.slot_type ?? 100,
    });
    const kws = (slot.keyword_compare || '').split(',').map((s: string) => s.trim());
    setEditKeywords([...kws, '', '', '', '', ''].slice(0, 5));
    setEditOpen(true);
  };

  const handleEdit = async () => {
    try {
      const kwJoined = editKeywords.filter((k) => k.trim()).join(',');
      await updateSlot(editId, { ...editSlot, keyword_compare: kwJoined });
      toast.success('슬롯이 수정되었습니다.');
      setEditOpen(false);
      fetchSlots();
    } catch (err: any) {
      toast.error(err.response?.data?.message || '수정 실패');
    }
  };

  const handleBulk = async () => {
    if (selected.length === 0) { toast.error('슬롯을 선택해주세요.'); return; }
    const kwJoined = bulkKeywords.filter((k) => k.trim()).join(',');
    const dataWithKw = kwJoined ? { ...bulkData, keyword_compare: kwJoined } : { ...bulkData };
    const filtered = Object.fromEntries(
      Object.entries(dataWithKw).filter(([, v]) => v !== '' && v !== null && v !== undefined)
    );
    if (Object.keys(filtered).length === 0) { toast.error('변경할 항목을 입력해주세요.'); return; }
    try {
      await bulkUpdateSlots(selected, filtered);
      toast.success('일괄 수정 완료');
      setBulkOpen(false);
      setBulkData({});
      setSelected([]);
      fetchSlots();
    } catch (err: any) {
      toast.error(err.response?.data?.message || '일괄수정 실패');
    }
  };

  const handleDelete = async () => {
    if (selected.length === 0) { toast.error('삭제할 슬롯을 선택하세요.'); return; }
    if (!confirm(`${selected.length}개 슬롯을 삭제하시겠습니까?`)) return;
    try {
      await Promise.all(selected.map((id) => deleteSlot(id)));
      toast.success('삭제 완료');
      setSelected([]);
      fetchSlots();
    } catch { toast.error('삭제 실패'); }
  };

  const toggleSelect = (id: number) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]);
  const toggleAll = () =>
    setSelected(selected.length === slots.length ? [] : slots.map((s) => s.id));

  const totalPages = Math.ceil(total / perPage);
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'distributor';

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>슬롯 확인</h2>

      {/* 세팅 안내 */}
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '16px 20px', marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>세팅 관련 안내</h3>
        <ul style={{ paddingLeft: 20, fontSize: 13, color: '#4b5563', lineHeight: 2, margin: 0 }}>
          <li>슬롯의 <strong>수정(✏️)</strong> 버튼 또는 <strong>일괄수정</strong>을 통해 슬롯 정보를 입력합니다.</li>
          <li><strong>상품 URL</strong>과 <strong>상품번호</strong>는 상품 페이지에서 확인할 수 있습니다. (URL의 <strong>/products/OOOOOOO</strong> 부분이 상품번호입니다)</li>
          <li><strong>MID값</strong>은 해당 상품의 MID를 입력합니다.</li>
          <li><strong>5위내 키워드</strong>는 검색 시 5위 이내에 노출되는 키워드를 최대 5개 입력합니다.</li>
          <li><strong>메인키워드</strong>는 대표 키워드 1개를 입력합니다.</li>
          <li>검색어는 CPC가 포함되지 않은 키워드로 입력해주세요.</li>
        </ul>
      </div>

      {/* 상단 툴바 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => { setBulkData({}); setBulkKeywords(['', '', '', '', '']); setBulkOpen(true); }} style={btnSecondary}>일괄수정</button>
          {isAdmin && (
            <button onClick={handleDelete} style={{ ...btnSecondary, color: '#dc2626' }}>삭제</button>
          )}
          <input style={{ ...inputStyle, width: 200 }} placeholder="키워드/MID/아이디 검색"
            value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
          <button onClick={handleSearch} style={btnSecondary}>검색</button>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select style={{ ...inputStyle, width: 120 }} value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="created_at">등록순</option>
            <option value="start_date">시작일순</option>
            <option value="end_date">종료일순</option>
            <option value="id">번호순</option>
          </select>
          <button onClick={() => setOrder(order === 'DESC' ? 'ASC' : 'DESC')} style={btnSecondary}>
            {order === 'DESC' ? '↓ 내림' : '↑ 오름'}
          </button>
          {/* TODO: 엑셀 기능 나중에 활성화 */}
          {/* <button onClick={handleDownloadTemplate} style={btnSecondary}>엑셀 가이드</button> */}
          {/* <button onClick={handleExport} style={btnPrimary}>엑셀 다운로드</button> */}
        </div>
      </div>

      {/* 테이블 */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, minWidth: 1200 }}>
          <thead>
            <tr>
              {['', '번호', '상태', '생성자', '아이디', '남은일수', '시작일', '종료일', '메인키워드', '키워드(5개)', 'MID', '상품번호', '상품명', '상품URL', '메모', '수정'].map((h, i) => (
                <th key={i} style={thStyle}>
                  {i === 0 ? <input type="checkbox" checked={selected.length === slots.length && slots.length > 0} onChange={toggleAll} /> : h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={16} style={{ ...tdStyle, textAlign: 'center' }}>로딩 중...</td></tr>
            ) : slots.length === 0 ? (
              <tr><td colSpan={16} style={{ ...tdStyle, textAlign: 'center' }}>데이터가 없습니다.</td></tr>
            ) : (
              slots.map((s: any) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={tdStyle}><input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggleSelect(s.id)} /></td>
                  <td style={tdStyle}>{s.id}</td>
                  <td style={tdStyle}><StatusBadge status={s.end_date && new Date(s.end_date) < new Date() ? 'expired' : s.status} /></td>
                  <td style={tdStyle}>{s.creator_username || '-'}</td>
                  <td style={tdStyle}>{s.user_username || '-'}</td>
                  <td style={tdStyle}>{getRemainingDays(s.end_date)}</td>
                  <td style={tdStyle}>{s.start_date || '-'}</td>
                  <td style={tdStyle}>{s.end_date || '-'}</td>
                  <td style={tdStyle}>{s.keyword_main || '-'}</td>
                  <td style={{ ...tdStyle, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.keyword_compare || ''}>{s.keyword_compare || '-'}</td>
                  <td style={tdStyle}>{s.single_mid || '-'}</td>
                  <td style={tdStyle}>{s.product_id || '-'}</td>
                  <td style={tdStyle}>{s.product_name || '-'}</td>
                  <td style={{ ...tdStyle, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.product_url || ''}>{s.product_url || '-'}</td>
                  <td style={{ ...tdStyle, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.memo || ''}>{s.memo || '-'}</td>
                  <td style={tdStyle}>
                    <button onClick={() => openEdit(s)} style={btnSm}>✏️</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <select style={{ ...inputStyle, width: 100 }} value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}>
          <option value={20}>20개</option>
          <option value={50}>50개</option>
          <option value={100}>100개</option>
        </select>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        <span style={{ fontSize: 13, color: '#6b7280' }}>총 {total}건</span>
      </div>

      {/* 수정 모달 */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="슬롯 수정">
        <p style={{ fontSize: 12, color: '#d97706', marginBottom: 12 }}>슬롯 정보(키워드, URL, MID 등)를 수정하면 상태가 자동으로 '대기'로 변경됩니다.</p>
        {currentUser?.role === 'admin' && (
          <div style={fieldStyle}>
            <label style={labelStyle}>상태</label>
            <select style={inputStyle} value={editSlot.status || ''} onChange={(e) => setEditSlot({ ...editSlot, status: e.target.value as any })}>
              <option value="pending">대기</option>
              <option value="active">활성</option>
              <option value="expired">만료</option>
            </select>
          </div>
        )}
        <div style={fieldStyle}>
          <label style={labelStyle}>슬롯타입</label>
          <select style={inputStyle} value={editSlot.slot_type ?? 100} onChange={(e) => setEditSlot({ ...editSlot, slot_type: Number(e.target.value) })}>
            <option value={100}>100타</option>
          </select>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>상품 URL</label>
          <input style={inputStyle} value={editSlot.product_url || ''} onChange={(e) => setEditSlot({ ...editSlot, product_url: e.target.value })} placeholder="https://..." />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>상품명</label>
          <input style={inputStyle} value={(editSlot as any).product_name || ''} onChange={(e) => setEditSlot({ ...editSlot, product_name: e.target.value } as any)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>상품번호</label>
            <input style={inputStyle} value={(editSlot as any).product_id || ''} onChange={(e) => setEditSlot({ ...editSlot, product_id: e.target.value } as any)} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>MID값</label>
            <input style={inputStyle} value={editSlot.single_mid || ''} onChange={(e) => setEditSlot({ ...editSlot, single_mid: e.target.value })} />
          </div>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>5위내 키워드 (최대 5개)</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 6 }}>
            {editKeywords.map((kw, i) => (
              <input key={i} style={inputStyle} value={kw} placeholder={`키워드${i + 1}`}
                onChange={(e) => { const next = [...editKeywords]; next[i] = e.target.value; setEditKeywords(next); }} />
            ))}
          </div>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>메인키워드</label>
          <input style={inputStyle} value={editSlot.keyword_main || ''} onChange={(e) => setEditSlot({ ...editSlot, keyword_main: e.target.value })} />
        </div>
        {currentUser?.role !== 'user' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>시작일</label>
              <input style={inputStyle} type="date" value={editSlot.start_date || ''} onChange={(e) => setEditSlot({ ...editSlot, start_date: e.target.value })} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>종료일</label>
              <input style={inputStyle} type="date" value={editSlot.end_date || ''} onChange={(e) => setEditSlot({ ...editSlot, end_date: e.target.value })} />
            </div>
          </div>
        )}
        <div style={fieldStyle}>
          <label style={labelStyle}>메모</label>
          <textarea style={{ ...inputStyle, height: 60, resize: 'vertical' }} value={editSlot.memo || ''} onChange={(e) => setEditSlot({ ...editSlot, memo: e.target.value })} />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={() => setEditOpen(false)} style={btnSecondary}>취소</button>
          <button onClick={handleEdit} style={btnPrimary}>수정</button>
        </div>
      </Modal>

      {/* 일괄수정 모달 */}
      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title={`일괄수정 (${selected.length}건 선택)`}>
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>입력한 항목만 일괄 변경됩니다. 비워두면 변경하지 않습니다.</p>
        {currentUser?.role === 'admin' && (
          <div style={fieldStyle}>
            <label style={labelStyle}>상태 변경</label>
            <select style={inputStyle} value={(bulkData as any).status || ''} onChange={(e) => setBulkData({ ...bulkData, status: e.target.value as any })}>
              <option value="">변경 안함</option>
              <option value="pending">대기</option>
              <option value="active">활성</option>
              <option value="expired">만료</option>
            </select>
          </div>
        )}
        <div style={fieldStyle}>
          <label style={labelStyle}>슬롯타입 변경</label>
          <select style={inputStyle} value={(bulkData as any).slot_type ?? ''} onChange={(e) => setBulkData({ ...bulkData, slot_type: e.target.value ? Number(e.target.value) : undefined as any })}>
            <option value="">변경 안함</option>
            <option value={100}>100타</option>
          </select>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>상품 URL</label>
          <input style={inputStyle} value={(bulkData as any).product_url || ''} onChange={(e) => setBulkData({ ...bulkData, product_url: e.target.value })} placeholder="https://..." />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>상품명</label>
          <input style={inputStyle} value={(bulkData as any).product_name || ''} onChange={(e) => setBulkData({ ...bulkData, product_name: e.target.value })} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>상품번호</label>
            <input style={inputStyle} value={(bulkData as any).product_id || ''} onChange={(e) => setBulkData({ ...bulkData, product_id: e.target.value })} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>MID값</label>
            <input style={inputStyle} value={(bulkData as any).single_mid || ''} onChange={(e) => setBulkData({ ...bulkData, single_mid: e.target.value })} />
          </div>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>5위내 키워드 (최대 5개)</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 6 }}>
            {bulkKeywords.map((kw, i) => (
              <input key={i} style={inputStyle} value={kw} placeholder={`키워드${i + 1}`}
                onChange={(e) => { const next = [...bulkKeywords]; next[i] = e.target.value; setBulkKeywords(next); }} />
            ))}
          </div>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>메인키워드</label>
          <input style={inputStyle} value={(bulkData as any).keyword_main || ''} onChange={(e) => setBulkData({ ...bulkData, keyword_main: e.target.value })} />
        </div>
        {currentUser?.role !== 'user' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>시작일</label>
              <input style={inputStyle} type="date" value={(bulkData as any).start_date || ''} onChange={(e) => setBulkData({ ...bulkData, start_date: e.target.value })} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>종료일</label>
              <input style={inputStyle} type="date" value={(bulkData as any).end_date || ''} onChange={(e) => setBulkData({ ...bulkData, end_date: e.target.value })} />
            </div>
          </div>
        )}
        <div style={fieldStyle}>
          <label style={labelStyle}>메모</label>
          <textarea style={{ ...inputStyle, height: 60, resize: 'vertical' }} value={(bulkData as any).memo || ''} onChange={(e) => setBulkData({ ...bulkData, memo: e.target.value })} />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={() => setBulkOpen(false)} style={btnSecondary}>취소</button>
          <button onClick={handleBulk} style={btnPrimary}>일괄수정</button>
        </div>
      </Modal>
    </div>
  );
}

const thStyle: React.CSSProperties = { background: '#1a2744', color: '#fff', fontSize: 13, fontWeight: 500, padding: '12px 10px', textAlign: 'left', whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '10px', fontSize: 13, whiteSpace: 'nowrap' };
const inputStyle: React.CSSProperties = { border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 12px', fontSize: 14, width: '100%', boxSizing: 'border-box' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 };
const fieldStyle: React.CSSProperties = { marginBottom: 14 };
const btnPrimary: React.CSSProperties = { background: '#8B1A2E', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 13, cursor: 'pointer' };
const btnSecondary: React.CSSProperties = { background: '#fff', border: '1px solid #d1d5db', color: '#374151', borderRadius: 6, padding: '7px 16px', fontSize: 13, cursor: 'pointer' };
const btnSm: React.CSSProperties = { ...btnSecondary, padding: '4px 10px', fontSize: 12 };
