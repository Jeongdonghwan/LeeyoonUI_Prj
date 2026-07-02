import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import axios from 'axios';
import { useAuthStore } from './store/authStore';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Notice from './pages/Notice';
import AccountManage from './pages/AccountManage';
import SlotManage from './pages/SlotManage';
import SlotView from './pages/SlotView';
import LogManage from './pages/LogManage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function RoleRoute({ children, roles }: { children: React.ReactNode; roles: string[] }) {
  const user = useAuthStore((s) => s.user);
  if (!user || !roles.includes(user.role)) return <Navigate to="/slots" replace />;
  return <>{children}</>;
}

export default function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 새로고침 시 refresh token으로 세션 복구
    axios.post('/api/auth/refresh', {}, { withCredentials: true })
      .then((res) => {
        const { access_token } = res.data.data;
        // refresh 응답에 user 정보가 없으므로 토큰 디코딩
        const payload = JSON.parse(atob(access_token.split('.')[1]));
        const user = payload.sub;
        useAuthStore.getState().setAuth(access_token, user);
      })
      .catch(() => {
        // refresh 실패 시 로그인 페이지로
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#6b7280' }}>로딩 중...</div>;
  }

  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/slots" replace />} />
          <Route path="notice" element={<Notice />} />
          <Route path="accounts" element={
            <RoleRoute roles={['admin', 'distributor']}>
              <AccountManage />
            </RoleRoute>
          } />
          <Route path="slots" element={<SlotManage />} />
          <Route path="slots/register" element={<SlotView />} />
          <Route path="logs" element={
            <RoleRoute roles={['admin', 'distributor']}>
              <LogManage />
            </RoleRoute>
          } />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
