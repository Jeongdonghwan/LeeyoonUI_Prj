import { useState, useEffect, type FormEvent } from 'react';
import { getUsers, createUser, updateUser, deleteUser, addCampaignQuantity } from '../api/users';
import { useAuthStore } from '../store/authStore';
import type { User } from '../types';
import Modal from '../components/common/Modal';
import Pagination from '../components/common/Pagination';
import {
  colors, cardStyle, thStyle, tdStyle, inputStyle, labelStyle, fieldStyle,
  btnPrimary, btnSecondary, btnDanger, btnSm, badgeBase, ROLE_META, PRODUCTS, PRODUCT_META, type Role, type ProductType,
} from '../styles/theme';
import { IconPlus, IconEdit } from '../components/common/icons';
import toast from 'react-hot-toast';

export default function AccountManage() {
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const perPage = 50;

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role: 'user', company: '', memo: '' });

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ id: 0, username: '', password: '', role: 'user', company: '', memo: '' });
  const [editPrices, setEditPrices] = useState<Record<string, number | ''>>({ bdc1: '', bdc2: '', bdc3: '', bdcnav: '' });

  const [qtyOpen, setQtyOpen] = useState(false);
  const [qtyTarget, setQtyTarget] = useState<{ id: number; username: string }>({ id: 0, username: '' });
  const [qty, setQty] = useState(1);
  const [qtyProduct, setQtyProduct] = useState<ProductType>('bdc1');
  const [qtyStart, setQtyStart] = useState('');
  const [qtyEnd, setQtyEnd] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsers({ search, page, per_page: perPage });
      setUsers(res.data.data.users);
      setTotal(res.data.data.total);
    } catch { toast.error('계정 목록을 불러오지 못했습니다.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchUsers(); }, [page]);

  const handleSearch = () => { setPage(1); fetchUsers(); };

  const roleOptions = currentUser?.role === 'admin'
    ? [{ value: 'distributor', label: '총판' }, { value: 'agency', label: '대행사' }, { value: 'user', label: '광고주' }]
    : [{ value: 'agency', label: '대행사' }, { value: 'user', label: '광고주' }];

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password) return toast.error('아이디와 비밀번호는 필수입니다.');
    try {
      await createUser(form);
      toast.success('계정이 추가되었습니다.');
      setAddOpen(false);
      setForm({ username: '', password: '', role: 'user', company: '', memo: '' });
      fetchUsers();
    } catch (err: any) { toast.error(err.response?.data?.message || '계정 추가 실패'); }
  };

  const openEdit = (u: User) => {
    setEditForm({ id: u.id, username: u.username, password: '', role: u.role, company: u.company || '', memo: u.memo || '' });
    const p = u.prices || {};
    setEditPrices({ bdc1: p.bdc1 ?? '', bdc2: p.bdc2 ?? '', bdc3: p.bdc3 ?? '', bdcnav: p.bdcnav ?? '' });
    setEditOpen(true);
  };
  const handleEdit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const data: any = { role: editForm.role, company: editForm.company, memo: editForm.memo };
      if (editForm.password) data.password = editForm.password;
      data.prices = Object.fromEntries(PRODUCTS.map((pt) => [pt, Number(editPrices[pt]) || 0]));
      await updateUser(editForm.id, data);
      toast.success('계정이 수정되었습니다.');
      setEditOpen(false);
      fetchUsers();
    } catch (err: any) { toast.error(err.response?.data?.message || '수정 실패'); }
  };

  const handleDelete = async () => {
    if (selected.length === 0) return toast.error('삭제할 계정을 선택하세요.');
    if (!confirm(`${selected.length}개 계정을 삭제하시겠습니까?`)) return;
    try {
      await Promise.all(selected.map((id) => deleteUser(id)));
      toast.success('삭제 완료');
      setSelected([]);
      fetchUsers();
    } catch { toast.error('삭제 실패'); }
  };

  const openQty = (u: User) => {
    setQtyTarget({ id: u.id, username: u.username });
    setQty(1); setQtyProduct('bdc1'); setQtyStart(''); setQtyEnd('');
    setQtyOpen(true);
  };
  const handleAddQty = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await addCampaignQuantity(qtyTarget.id, {
        quantity: qty, product_type: qtyProduct,
        start_date: qtyStart || undefined, end_date: qtyEnd || undefined,
      });
      toast.success(`${qtyTarget.username}에 캠페인 ${qty}개 추가`);
      setQtyOpen(false);
      fetchUsers();
    } catch (err: any) { toast.error(err.response?.data?.message || '캠페인 추가 실패'); }
  };

  const toggleSelect = (id: number) => setSelected((p) => p.includes(id) ? p.filter((v) => v !== id) : [...p, id]);
  const toggleAll = () => setSelected(selected.length === users.length ? [] : users.map((u) => u.id));
  const totalPages = Math.ceil(total / perPage);
  const isLeaf = (r: Role) => r === 'user' || r === 'agency';
  const advertiserCount = users.filter((u) => u.role === 'user').length;

  return (
    <div>
      <h2 style={styles.h2}>계정관리</h2>
      <p style={styles.sub}>전체 위계 구조의 계정 데이터를 실시간으로 관리할 수 있습니다.</p>

      <div style={{ ...cardStyle, ...styles.summary }}>
        <div style={{ fontSize: 13, color: colors.success, fontWeight: 600 }}>● 광고주</div>
        <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>{advertiserCount}<span style={{ fontSize: 14, color: colors.textMuted }}>개 (현재 페이지)</span></div>
      </div>

      <div style={{ ...cardStyle, padding: 18 }}>
        <div style={styles.toolbar}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ ...inputStyle, width: 220 }} placeholder="아이디 검색" value={search}
              onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
            <button onClick={handleSearch} style={btnSecondary}>검색</button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setAddOpen(true)} style={{ ...btnPrimary, display: 'inline-flex', alignItems: 'center', gap: 5 }}><IconPlus size={13} color="#fff" /> 계정 등록</button>
            <button onClick={handleDelete} style={btnDanger}>삭제</button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={thStyle}><input type="checkbox" checked={selected.length === users.length && users.length > 0} onChange={toggleAll} /></th>
              {['번호', '아이디', '권한', '총판', '대행사', '광고주', '회사명', '캠페인', '메모', '정보수정', '계정등록'].map((h) => <th key={h} style={thStyle}>{h}</th>)}
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} style={{ ...tdStyle, textAlign: 'center', padding: 40 }}>로딩 중...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={12} style={{ ...tdStyle, textAlign: 'center', padding: 40, color: colors.textMuted }}>데이터가 없습니다.</td></tr>
              ) : users.map((u) => (
                <tr key={u.id}>
                  <td style={tdStyle}><input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggleSelect(u.id)} /></td>
                  <td style={tdStyle}>{u.id}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{u.username}</td>
                  <td style={tdStyle}><span style={{ ...badgeBase, background: ROLE_META[u.role].bg, color: ROLE_META[u.role].fg }}>{ROLE_META[u.role].label}</span></td>
                  <td style={tdStyle}>{u.sub_distributor || '-'}</td>
                  <td style={tdStyle}>{u.sub_agency || '-'}</td>
                  <td style={tdStyle}>{u.sub_user || '-'}</td>
                  <td style={tdStyle}>{u.company || '-'}</td>
                  <td style={tdStyle}>
                    <span style={{ color: u.campaign_used > 0 ? colors.success : colors.textMuted }}>{u.campaign_used}</span>
                    {' / '}<span style={{ fontWeight: 600 }}>{u.campaign_total}</span>
                  </td>
                  <td style={{ ...tdStyle, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.memo || '-'}</td>
                  <td style={tdStyle}>
                    <button onClick={() => openEdit(u)} style={editBtnStyle}><IconEdit size={13} color={colors.primary} /> 수정하기</button>
                  </td>
                  <td style={tdStyle}>
                    {isLeaf(u.role)
                      ? <button onClick={() => openQty(u)} style={{ ...btnSm, background: colors.success, color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconPlus size={12} color="#fff" /> 캠페인 추가</button>
                      : <span style={{ color: colors.textFaint }}>-</span>}
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

      {/* 계정 추가 */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="계정 등록">
        <form onSubmit={handleAdd}>
          <Field label="아이디" req><input style={inputStyle} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></Field>
          <Field label="비밀번호" req><input style={inputStyle} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          <Field label="권한"><select style={inputStyle} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{roleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
          <Field label="회사명"><input style={inputStyle} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
          <Field label="메모"><textarea style={{ ...inputStyle, height: 60, resize: 'vertical' }} value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} /></Field>
          <Footer onCancel={() => setAddOpen(false)} submitLabel="등록" />
        </form>
      </Modal>

      {/* 계정 수정 */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={`계정 수정 - ${editForm.username}`}>
        <form onSubmit={handleEdit}>
          <Field label="비밀번호 (변경시에만 입력)"><input style={inputStyle} type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} /></Field>
          <Field label="권한"><select style={inputStyle} value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>{roleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
          <Field label="회사명"><input style={inputStyle} value={editForm.company} onChange={(e) => setEditForm({ ...editForm, company: e.target.value })} /></Field>
          <Field label="메모"><textarea style={{ ...inputStyle, height: 60, resize: 'vertical' }} value={editForm.memo} onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })} /></Field>
          <div style={{ marginTop: 6, marginBottom: 4 }}>
            <label style={{ ...labelStyle, marginBottom: 8 }}>상품별 단가 (원)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {PRODUCTS.map((pt) => (
                <div key={pt} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: colors.textMuted, width: 84, flexShrink: 0 }}>{PRODUCT_META[pt].label}</span>
                  <input type="number" min={0} step={100} style={{ ...inputStyle, padding: '7px 10px' }} placeholder="0"
                    value={editPrices[pt]} onChange={(e) => setEditPrices({ ...editPrices, [pt]: e.target.value ? Number(e.target.value) : '' })} />
                </div>
              ))}
            </div>
          </div>
          <Footer onCancel={() => setEditOpen(false)} submitLabel="수정" />
        </form>
      </Modal>

      {/* 캠페인 수량 추가 */}
      <Modal open={qtyOpen} onClose={() => setQtyOpen(false)} title={`캠페인 추가 - ${qtyTarget.username}`}>
        <form onSubmit={handleAddQty}>
          <Field label="상품"><select style={inputStyle} value={qtyProduct} onChange={(e) => setQtyProduct(e.target.value as ProductType)}>{PRODUCTS.map((p) => <option key={p} value={p}>{PRODUCT_META[p].label}</option>)}</select></Field>
          <Field label="추가할 수량"><input style={inputStyle} type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="시작일"><input style={inputStyle} type="date" value={qtyStart} onChange={(e) => setQtyStart(e.target.value)} /></Field>
            <Field label="종료일"><input style={inputStyle} type="date" value={qtyEnd} onChange={(e) => setQtyEnd(e.target.value)} /></Field>
          </div>
          <Footer onCancel={() => setQtyOpen(false)} submitLabel="추가" />
        </form>
      </Modal>
    </div>
  );
}

function Field({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return <div style={fieldStyle}><label style={labelStyle}>{label} {req && <span style={{ color: colors.danger }}>*</span>}</label>{children}</div>;
}
function Footer({ onCancel, submitLabel }: { onCancel: () => void; submitLabel: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
      <button type="button" onClick={onCancel} style={btnSecondary}>취소</button>
      <button type="submit" style={btnPrimary}>{submitLabel}</button>
    </div>
  );
}

const editBtnStyle: React.CSSProperties = {
  ...btnSm, background: colors.primarySoft, color: colors.primary, border: `1px solid ${colors.primarySoft}`,
  display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 600,
};

const styles: Record<string, React.CSSProperties> = {
  h2: { fontSize: 22, fontWeight: 700, color: colors.text },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 6, marginBottom: 18 },
  summary: { padding: '16px 20px', marginBottom: 18, width: 220 },
  toolbar: { display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
};
