import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { IconMenu, IconStar } from '../common/icons';
import { colors } from '../../styles/theme';

export default function Layout() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* 모바일 오버레이 */}
      <div className={`bdc-overlay ${open ? 'show' : ''}`} onClick={() => setOpen(false)} />

      <Sidebar open={open} onNavigate={() => setOpen(false)} />

      {/* 모바일 상단바 */}
      <div className="bdc-topbar">
        <button onClick={() => setOpen(true)} aria-label="메뉴" style={styles.hamburger}>
          <IconMenu size={22} color={colors.text} />
        </button>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 17, fontWeight: 800, color: colors.text }}>
          <IconStar size={18} color={colors.primary} /> 북두칠성
        </span>
      </div>

      <main className="bdc-main" style={{ flex: 1, background: colors.bg, minHeight: '100vh' }}>
        <Outlet />
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  hamburger: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 38, height: 38, borderRadius: 8, border: `1px solid ${colors.border}`,
    background: '#fff', cursor: 'pointer',
  },
};
