import { useState, useEffect, type FormEvent } from 'react';
import { getUsers, createUser, updateUser, deleteUser, addSlot } from '../api/users';
import { useAuthStore } from '../store/authStore';
import type { User } from '../types';
import Modal from '../components/common/Modal';
import Pagination from '../components/common/Pagination';
import toast from 'react-hot-toast';

export default function AccountManage() {
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  // 추가 모달
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role: 'user', company: '', memo: '' });

  // 수정 모달
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ id: 0, password: '', role: 'user', company: '', memo: '' });

  // 슬롯추가 모달
  const [slotOpen, setSlotOpen] = useState(false);
  const [slotTarget, setSlotTarget] = useState<{ id: number; username: string }>({ id: 0, username: '' });
  const [slotQty, setSlotQty] = useState(1);
  const [slotType, setSlotType] = useState(100);

  const perPage = 50;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsers({ search, page, per_page: perPage });
      setUsers(res.data.data.users);
      setTotal(res.data.data.total);
    } catch {
      toast.error('계정 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [page]);

  const handleSearch = () => { setPage(1); fetchUsers(); };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password) {
      toast.error('아이디와 비밀번호는 필수입니다.');
      return;
    }
    try {
      await createUser(form);
      toast.success('계정이 추가되었습니다.');
      setAddOpen(false);
      setForm({ username: '', password: '', role: 'user', company: '', memo: '' });
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || '계정 추가 실패');
    }
  };

  const openEdit = (u: User) => {
    setEditForm({ id: u.id, password: '', role: u.role, company: u.company || '', memo: u.memo || '' });
    setEditOpen(true);
  };

  const handleEdit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const data: any = { role: editForm.role, company: editForm.company, memo: editForm.memo };
      if (editForm.password) data.password = editForm.password;
      await updateUser(editForm.id, data);
      toast.success('계정이 수정되었습니다.');
      setEditOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || '수정 실패');
    }
  };

  const handleDelete = async () => {
    if (selected.length === 0) { toast.error('삭제할 계정을 선택하세요.'); return; }
    if (!confirm(`${selected.length}개 계정을 삭제하시겠습니까?`)) return;
    try {
      await Promise.all(selected.map((id) => deleteUser(id)));
      toast.success('삭제 완료');
      setSelected([]);
      fetchUsers();
    } catch { toast.error('삭제 실패'); }
  };

  const [slotStartDate, setSlotStartDate] = useState('');
  const [slotEndDate, setSlotEndDate] = useState('');

  const openSlotModal = (u: User) => {
    setSlotTarget({ id: u.id, username: u.username });
    setSlotQty(1);
    setSlotType(100);
    setSlotStartDate('');
    setSlotEndDate('');
    setSlotOpen(true);
  };

  const handleAddSlot = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await addSlot(slotTarget.id, {
        quantity: slotQty,
        slot_type: slotType,
        start_date: slotStartDate || undefined,
        end_date: slotEndDate || undefined,
      });
      toast.success(`${slotTarget.username}에 슬롯 ${slotQty}개 추가`);
      setSlotOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || '슬롯 추가 실패');
    }
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    setSelected(selected.length === users.length ? [] : users.map((u) => u.id));
  };

  const totalPages = Math.ceil(total / perPage);

  const roleOptions = currentUser?.role === 'admin'
    ? [{ value: 'distributor', label: '총판관리자' }, { value: 'user', label: '일반유저' }]
    : [{ value: 'user', label: '일반유저' }];

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>계정관리</h2>

      {/* 상단 툴바 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={inputStyle}
            placeholder="아이디 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} style={btnSecondary}>검색</button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setAddOpen(true)} style={btnPrimary}>추가</button>
          <button onClick={handleDelete} style={{ ...btnSecondary, color: '#dc2626' }}>삭제</button>
        </div>
      </div>

      {/* 테이블 */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8 }}>
          <thead>
            <tr>
              {['', '아이디', '상위아이디', '권한', '회사', '수량', '메모', '슬롯추가', '수정'].map((h, i) => (
                <th key={i} style={thStyle}>
                  {i === 0 ? <input type="checkbox" checked={selected.length === users.length && users.length > 0} onChange={toggleAll} /> : h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ ...tdStyle, textAlign: 'center' }}>로딩 중...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={9} style={{ ...tdStyle, textAlign: 'center' }}>데이터가 없습니다.</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={tdStyle}><input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggleSelect(u.id)} /></td>
                  <td style={tdStyle}>{u.username}</td>
                  <td style={tdStyle}>{u.parent_username || '-'}</td>
                  <td style={tdStyle}>
                    <span style={{
                      ...badgeBase,
                      ...(u.role === 'admin' ? badgeAdmin : u.role === 'distributor' ? badgeDist : badgeUser),
                    }}>
                      {u.role === 'admin' ? '관리자' : u.role === 'distributor' ? '총판' : '유저'}
                    </span>
                  </td>
                  <td style={tdStyle}>{u.company || '-'}</td>
                  <td style={tdStyle}>
                    <span style={{ color: u.used_slots > 0 ? '#166534' : '#6b7280' }}>
                      {u.used_slots}
                    </span>
                    {' / '}
                    <span style={{ fontWeight: 500 }}>{u.total_slots}</span>
                  </td>
                  <td style={{ ...tdStyle, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.memo || '-'}</td>
                  <td style={tdStyle}>
                    <button onClick={() => openSlotModal(u)} style={btnSm}>슬롯추가</button>
                  </td>
                  <td style={tdStyle}>
                    <button onClick={() => openEdit(u)} style={btnSm}>✏️</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* 추가 모달 */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="계정 추가">
        <form onSubmit={handleAdd}>
          <div style={fieldStyle}>
            <label style={labelStyle}>아이디 <span style={{ color: '#dc2626' }}>*</span></label>
            <input style={inputStyle} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>비밀번호 <span style={{ color: '#dc2626' }}>*</span></label>
            <input style={inputStyle} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>권한</label>
            <select style={inputStyle} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {roleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>회사명</label>
            <input style={inputStyle} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>메모</label>
            <textarea style={{ ...inputStyle, height: 60, resize: 'vertical' }} value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" onClick={() => setAddOpen(false)} style={btnSecondary}>취소</button>
            <button type="submit" style={btnPrimary}>추가</button>
          </div>
        </form>
      </Modal>

      {/* 수정 모달 */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="계정 수정">
        <form onSubmit={handleEdit}>
          <div style={fieldStyle}>
            <label style={labelStyle}>비밀번호 (변경시에만 입력)</label>
            <input style={inputStyle} type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>권한</label>
            <select style={inputStyle} value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
              {roleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>회사명</label>
            <input style={inputStyle} value={editForm.company} onChange={(e) => setEditForm({ ...editForm, company: e.target.value })} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>메모</label>
            <textarea style={{ ...inputStyle, height: 60, resize: 'vertical' }} value={editForm.memo} onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" onClick={() => setEditOpen(false)} style={btnSecondary}>취소</button>
            <button type="submit" style={btnPrimary}>수정</button>
          </div>
        </form>
      </Modal>

      {/* 슬롯추가 모달 */}
      <Modal open={slotOpen} onClose={() => setSlotOpen(false)} title={`슬롯 추가 - ${slotTarget.username}`}>
        <form onSubmit={handleAddSlot}>
          <div style={fieldStyle}>
            <label style={labelStyle}>슬롯타입</label>
            <select style={inputStyle} value={slotType} onChange={(e) => setSlotType(Number(e.target.value))}>
              <option value={100}>100타</option>
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>추가할 수량</label>
            <input style={inputStyle} type="number" min={1} value={slotQty} onChange={(e) => setSlotQty(Number(e.target.value))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>시작일</label>
              <input style={inputStyle} type="date" value={slotStartDate} onChange={(e) => setSlotStartDate(e.target.value)} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>종료일</label>
              <input style={inputStyle} type="date" value={slotEndDate} onChange={(e) => setSlotEndDate(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" onClick={() => setSlotOpen(false)} style={btnSecondary}>취소</button>
            <button type="submit" style={btnPrimary}>추가</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// Styles
const thStyle: React.CSSProperties = { background: '#1a2744', color: '#fff', fontSize: 13, fontWeight: 500, padding: '12px 16px', textAlign: 'left' };
const tdStyle: React.CSSProperties = { padding: '10px 16px', fontSize: 13 };
const inputStyle: React.CSSProperties = { border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 12px', fontSize: 14, width: '100%', boxSizing: 'border-box' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 };
const fieldStyle: React.CSSProperties = { marginBottom: 14 };
const btnPrimary: React.CSSProperties = { background: '#8B1A2E', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 13, cursor: 'pointer' };
const btnSecondary: React.CSSProperties = { background: '#fff', border: '1px solid #d1d5db', color: '#374151', borderRadius: 6, padding: '7px 16px', fontSize: 13, cursor: 'pointer' };
const btnSm: React.CSSProperties = { ...btnSecondary, padding: '4px 10px', fontSize: 12 };
const badgeBase: React.CSSProperties = { display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: 12, fontWeight: 500 };
const badgeAdmin: React.CSSProperties = { background: '#fee2e2', color: '#991b1b' };
const badgeDist: React.CSSProperties = { background: '#dbeafe', color: '#1e40af' };
const badgeUser: React.CSSProperties = { background: '#dcfce7', color: '#166534' };
