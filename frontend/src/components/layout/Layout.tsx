import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    flex: 1,
    marginLeft: 180,
    padding: '24px 28px',
    background: '#f3f4f6',
    minHeight: '100vh',
  },
};
