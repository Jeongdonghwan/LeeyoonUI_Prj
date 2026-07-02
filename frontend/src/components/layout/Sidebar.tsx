import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { logout as logoutApi } from '../../api/auth';
import toast from 'react-hot-toast';

const Icon = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const icons = {
  notice: <Icon d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />,
  accounts: (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  slots: (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  ),
  register: (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  logs: (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  logout: <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
};

const menuItems = [
  { path: '/notice', label: '공지사항', icon: icons.notice, roles: ['admin', 'distributor', 'user'] },
  { path: '/accounts', label: '계정관리', icon: icons.accounts, roles: ['admin', 'distributor'] },
  { path: '/slots', label: '슬롯 확인', icon: icons.slots, roles: ['admin', 'distributor', 'user'] },
  // { path: '/slots/register', label: '슬롯 등록', icon: icons.register, roles: ['admin', 'distributor', 'user'] },
  { path: '/logs', label: '로그관리', icon: icons.logs, roles: ['admin', 'distributor'] },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch { /* ignore */ }
    logout();
    toast.success('로그아웃 되었습니다.');
    navigate('/login');
  };

  const visibleMenus = menuItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  return (
    <aside style={styles.sidebar}>
      <div style={styles.logoArea}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/logo.svg" alt="Malon" style={{ width: 28, height: 28 }} />
          <span style={styles.logoText}>Malon</span>
        </div>
      </div>

      <nav style={styles.nav}>
        {visibleMenus.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/slots'}
            style={({ isActive }) => ({
              ...styles.menuItem,
              ...(isActive ? styles.menuItemActive : {}),
            })}
          >
            <span style={styles.icon}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div style={styles.bottom}>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {icons.logout}
            로그아웃
          </span>
        </button>
      </div>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 180,
    minHeight: '100vh',
    background: '#6B0F1F',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    left: 0,
    top: 0,
    zIndex: 100,
  },
  logoArea: {
    padding: '20px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  logoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 700,
  },
  nav: {
    flex: 1,
    paddingTop: 8,
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '11px 16px',
    color: '#f9d5db',
    textDecoration: 'none',
    fontSize: 14,
    borderLeft: '3px solid transparent',
  },
  menuItemActive: {
    borderLeft: '3px solid #fff',
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
  },
  icon: {
    display: 'flex',
    alignItems: 'center',
  },
  bottom: {
    padding: '16px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
  },
  logoutBtn: {
    width: '100%',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.3)',
    color: '#f9d5db',
    borderRadius: 6,
    padding: '8px 0',
    fontSize: 13,
    cursor: 'pointer',
  },
};
