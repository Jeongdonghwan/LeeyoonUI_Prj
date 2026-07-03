import { useEffect, useState, useCallback, type FormEvent } from 'react';
import { getNotices, createNotice, updateNotice, deleteNotice } from '../api/notices';
import type { Notice } from '../types';
import { useAuthStore } from '../store/authStore';
import Modal from '../components/common/Modal';
import { IconPin, IconSearch, IconPlus, IconEdit, IconTrash } from '../components/common/icons';
import {
  colors, cardStyle, thStyle, tdStyle, inputStyle, labelStyle, fieldStyle, btnPrimary, btnSecondary, btnDanger, btnSm,
} from '../styles/theme';
import toast from 'react-hot-toast';

export default function Notice() {
  const isAdmin = useAuthStore((s) => s.user?.role) === 'admin';
  const [list, setList] = useState<Notice[]>([]);
  const [search, setSearch] = useState('');

  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<Notice | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ id: 0, title: '', content: '', pinned: false });

  const load = useCallback(async () => {
    const res = await getNotices(search || undefined);
    setList(res.data.data.notices);
  }, [search]);
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openNew = () => { setForm({ id: 0, title: '', content: '', pinned: false }); setEditOpen(true); };
  const openEdit = (n: Notice, e: React.MouseEvent) => {
    e.stopPropagation();
    setForm({ id: n.id, title: n.title, content: n.content || '', pinned: !!n.pinned });
    setEditOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('제목을 입력해주세요.');
    try {
      if (form.id) await updateNotice(form.id, { title: form.title, content: form.content, pinned: form.pinned });
      else await createNotice({ title: form.title, content: form.content, pinned: form.pinned });
      toast.success(form.id ? '공지가 수정되었습니다.' : '공지가 등록되었습니다.');
      setEditOpen(false);
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || '저장 실패'); }
  };

  const remove = async (n: Notice, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('이 공지를 삭제할까요?')) return;
    await deleteNotice(n.id);
    toast.success('삭제되었습니다.');
    load();
  };

  const openView = (n: Notice) => { setViewing(n); setViewOpen(true); };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18 }}>
        <div>
          <h2 style={styles.h2}>공지사항</h2>
          <p style={styles.sub}>최신 공지사항을 확인할 수 있습니다.</p>
        </div>
        {isAdmin && <button style={{ ...btnPrimary, display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={openNew}><IconPlus size={13} color="#fff" /> 공지 등록</button>}
      </div>

      <div style={{ ...cardStyle, padding: 18 }}>
        <div style={{ position: 'relative', width: 280, marginBottom: 16 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: colors.textFaint }}><IconSearch size={15} /></span>
          <input style={{ ...inputStyle, paddingLeft: 32 }} placeholder="검색어를 입력해 주세요."
            value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()} />
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={thStyle}>제목</th>
            <th style={{ ...thStyle, textAlign: 'right', width: 130 }}>작성일자</th>
            {isAdmin && <th style={{ ...thStyle, textAlign: 'right', width: 120 }}>관리</th>}
          </tr></thead>
          <tbody>
            {list.map((n) => (
              <tr key={n.id} style={{ cursor: 'pointer' }} onClick={() => openView(n)}>
                <td style={{ ...tdStyle, whiteSpace: 'normal' }}>
                  {!!n.pinned && <span style={{ color: colors.primary, marginRight: 6, verticalAlign: 'middle', display: 'inline-flex' }}><IconPin size={14} /></span>}
                  <span style={{ color: n.pinned ? colors.primary : colors.text, fontWeight: n.pinned ? 600 : 400 }}>{n.title}</span>
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{n.created_at?.slice(0, 10)}</td>
                {isAdmin && (
                  <td style={{ ...tdStyle, textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button style={editBtn} onClick={(e) => openEdit(n, e)}><IconEdit size={13} color={colors.primary} /> 수정</button>
                      <button style={{ ...btnDanger, ...btnSm, display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={(e) => remove(n, e)}><IconTrash size={13} color={colors.danger} /></button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={isAdmin ? 3 : 2} style={{ ...tdStyle, textAlign: 'center', padding: 40, color: colors.textMuted }}>공지사항이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* 상세 보기 */}
      <Modal open={viewOpen} onClose={() => setViewOpen(false)} title={viewing?.title || '공지'}>
        <div style={{ fontSize: 12.5, color: colors.textMuted, marginBottom: 14 }}>
          {viewing?.author || '관리자'} · {viewing?.created_at?.slice(0, 10)}
        </div>
        <div style={{ fontSize: 14, color: colors.text, lineHeight: 1.7, whiteSpace: 'pre-wrap', minHeight: 60 }}>
          {viewing?.content || '내용이 없습니다.'}
        </div>
      </Modal>

      {/* 등록/수정 (admin) */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={form.id ? '공지 수정' : '공지 등록'}>
        <form onSubmit={submit}>
          <div style={fieldStyle}>
            <label style={labelStyle}>제목 <span style={{ color: colors.danger }}>*</span></label>
            <input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>내용</label>
            <textarea style={{ ...inputStyle, height: 160, resize: 'vertical' }} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: colors.textMuted, marginBottom: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} /> 상단 고정
          </label>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
            <button type="button" style={btnSecondary} onClick={() => setEditOpen(false)}>취소</button>
            <button type="submit" style={btnPrimary}>{form.id ? '수정' : '등록'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

const editBtn: React.CSSProperties = {
  ...btnSm, background: colors.primarySoft, color: colors.primary, border: 'none',
  display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600,
};

const styles: Record<string, React.CSSProperties> = {
  h2: { fontSize: 22, fontWeight: 700, color: colors.text },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
};
