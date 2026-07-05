import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { logout as logoutApi } from '../../api/auth';
import { colors, ROLE_META, PRODUCTS, PRODUCT_META, type Role } from '../../styles/theme';
import toast from 'react-hot-toast';

const Icon = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {d.split('|').map((p, i) => <path key={i} d={p} />)}
  </svg>
);

const icons = {
  notice: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  accounts: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2|M23 21v-2a4 4 0 0 0-3-3.87|M16 3.13a4 4 0 0 1 0 7.75|M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  campaign: 'M3 3h7v7H3z|M14 3h7v7h-7z|M14 14h7v7h-7z|M3 14h7v7H3z',
  logs: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z|M14 2v6h6|M16 13H8|M16 17H8',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4|M16 17l5-5-5-5|M21 12H9',
  star: 'M12 2l2.4 7.4H22l-6 4.6 2.3 7.4L12 17l-6.3 4.4L8 14 2 9.4h7.6z',
};

type MenuRole = Role;
const topMenus: { path: string; label: string; icon: string; roles: MenuRole[] }[] = [
  { path: '/notice', label: '공지사항', icon: icons.notice, roles: ['admin', 'distributor', 'agency', 'user'] },
  { path: '/accounts', label: '계정관리', icon: icons.accounts, roles: ['admin', 'distributor'] },
];

export default function Sidebar({ open = false, onNavigate }: { open?: boolean; onNavigate?: () => void }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try { await logoutApi(); } catch { /* ignore */ }
    logout();
    toast.success('로그아웃 되었습니다.');
    navigate('/login');
  };

  const role = (user?.role || 'user') as Role;
  const visibleTop = topMenus.filter((m) => m.roles.includes(role));
  const campaignActive = location.pathname.startsWith('/campaigns');

  return (
    <aside className={`bdc-sidebar ${open ? 'open' : ''}`} style={styles.sidebar}>
      <div style={styles.logoArea}>
        <span style={styles.logoIcon}><Icon d={icons.star} size={20} /></span>
        <span style={styles.logoText}>북두칠성</span>
      </div>

      <nav style={styles.nav}>
        {visibleTop.map((m) => (
          <NavLink key={m.path} to={m.path} onClick={onNavigate} style={({ isActive }) => menuStyle(isActive)}>
            <Icon d={m.icon} /> {m.label}
          </NavLink>
        ))}

        {/* 캠페인 관리 + 상품별 하위 메뉴 */}
        <NavLink to="/campaigns" end onClick={onNavigate} style={({ isActive }) => menuStyle(isActive || (campaignActive && location.pathname === '/campaigns'))}>
          <Icon d={icons.campaign} /> 캠페인 관리
        </NavLink>
        <div style={styles.subGroup}>
          {PRODUCTS.map((pt) => (
            <NavLink key={pt} to={`/campaigns/product/${pt}`} onClick={onNavigate} style={({ isActive }) => subMenuStyle(isActive)}>
              {PRODUCT_META[pt].label}
            </NavLink>
          ))}
        </div>

        {(role === 'admin' || role === 'distributor') && (
          <NavLink to="/logs" onClick={onNavigate} style={({ isActive }) => menuStyle(isActive)}>
            <Icon d={icons.logs} /> 캠페인 로그
          </NavLink>
        )}
      </nav>

      <div style={styles.bottom}>
        <div style={styles.accountBox}>
          <div style={styles.accountAvatar}>{(user?.username || '?').charAt(0).toUpperCase()}</div>
          <div style={{ overflow: 'hidden' }}>
            <div style={styles.accountName}>{user?.username}</div>
            <div style={{ ...styles.accountRole, color: ROLE_META[role].fg }}>{ROLE_META[role].label}</div>
          </div>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          <Icon d={icons.logout} size={15} /> 로그아웃
        </button>
      </div>
    </aside>
  );
}

function menuStyle(active: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
    margin: '2px 10px', borderRadius: 8, fontSize: 14, fontWeight: active ? 600 : 500,
    textDecoration: 'none', cursor: 'pointer',
    color: active ? colors.sidebarActiveText : colors.sidebarText,
    background: active ? colors.sidebarActiveBg : 'transparent',
  };
}
function subMenuStyle(active: boolean): React.CSSProperties {
  return {
    display: 'block', padding: '7px 14px 7px 44px', margin: '1px 10px', borderRadius: 8,
    fontSize: 13, fontWeight: active ? 600 : 400, textDecoration: 'none',
    color: active ? colors.sidebarActiveText : colors.textMuted,
    background: active ? colors.sidebarActiveBg : 'transparent',
  };
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 210, minHeight: '100vh', background: colors.sidebarBg,
    borderRight: `1px solid ${colors.border}`,
    display: 'flex', flexDirection: 'column', position: 'fixed', left: 0, top: 0, zIndex: 100,
  },
  logoArea: {
    display: 'flex', alignItems: 'center', gap: 9, padding: '20px 18px',
    borderBottom: `1px solid ${colors.border}`,
  },
  logoIcon: { color: colors.primary, display: 'flex' },
  logoText: { fontSize: 18, fontWeight: 800, color: colors.text, letterSpacing: '-0.02em' },
  nav: { flex: 1, paddingTop: 10 },
  subGroup: { marginBottom: 4 },
  bottom: { padding: 12, borderTop: `1px solid ${colors.border}` },
  accountBox: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px 10px',
  },
  accountAvatar: {
    width: 34, height: 34, borderRadius: 8, background: colors.primarySoft, color: colors.primary,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0,
  },
  accountName: { fontSize: 13, fontWeight: 600, color: colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  accountRole: { fontSize: 12, fontWeight: 600 },
  logoutBtn: {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    background: '#fff', border: `1px solid ${colors.border}`, color: colors.textMuted,
    borderRadius: 8, padding: '8px 0', fontSize: 13, cursor: 'pointer',
  },
};
