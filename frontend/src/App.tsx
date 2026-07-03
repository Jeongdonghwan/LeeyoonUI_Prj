import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import axios from 'axios';
import { useAuthStore } from './store/authStore';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Notice from './pages/Notice';
import AccountManage from './pages/AccountManage';
import CampaignManage from './pages/CampaignManage';
import ProductCampaign from './pages/ProductCampaign';
import CampaignDetail from './pages/CampaignDetail';
import LogManage from './pages/LogManage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function RoleRoute({ children, roles }: { children: React.ReactNode; roles: string[] }) {
  const user = useAuthStore((s) => s.user);
  if (!user || !roles.includes(user.role)) return <Navigate to="/campaigns" replace />;
  return <>{children}</>;
}

export default function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 새로고침 시 refresh token으로 세션 복구
    axios.post('/api/auth/refresh', {}, { withCredentials: true })
      .then((res) => {
        const { access_token } = res.data.data;
        // sub(id 문자열) + claims(username/role)로 유저 재구성
        const payload = JSON.parse(atob(access_token.split('.')[1]));
        const user = {
          id: Number(payload.sub),
          username: payload.username,
          role: payload.role,
          company: payload.company ?? null,
        };
        useAuthStore.getState().setAuth(access_token, user);
      })
      .catch(() => { /* 미로그인 */ })
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
          <Route index element={<Navigate to="/campaigns" replace />} />
          <Route path="notice" element={<Notice />} />
          <Route path="accounts" element={
            <RoleRoute roles={['admin', 'distributor']}><AccountManage /></RoleRoute>
          } />
          <Route path="campaigns" element={<CampaignManage />} />
          <Route path="campaigns/product/:productType" element={<ProductCampaign />} />
          <Route path="campaigns/:id" element={<CampaignDetail />} />
          <Route path="logs" element={
            <RoleRoute roles={['admin', 'distributor']}><LogManage /></RoleRoute>
          } />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
