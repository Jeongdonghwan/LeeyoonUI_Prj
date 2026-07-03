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
    marginLeft: 210,
    padding: '28px 32px',
    background: '#f4f6fa',
    minHeight: '100vh',
  },
};
