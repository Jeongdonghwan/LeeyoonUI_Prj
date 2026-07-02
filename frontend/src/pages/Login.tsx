import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error('아이디와 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      const res = await login(username.trim(), password);
      setAuth(res.data.data.access_token, res.data.data.user);
      toast.success('로그인 성공');
      navigate('/slots');
    } catch (err: any) {
      const msg = err.response?.data?.message || '로그인에 실패했습니다.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo.svg" alt="Malon" style={{ width: 48, height: 48, marginBottom: 12 }} />
          <h1 style={styles.logo}>Malon</h1>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>아이디</label>
          <input
            style={styles.input}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="아이디를 입력하세요"
            autoFocus
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>비밀번호</label>
          <input
            style={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호를 입력하세요"
          />
        </div>

        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#f3f4f6',
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: '40px 36px',
    width: 380,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  logo: {
    textAlign: 'center' as const,
    color: '#8B1A2E',
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 0,
  },
  field: {
    marginBottom: 18,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 4,
    color: '#374151',
  },
  input: {
    width: '100%',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    padding: '8px 12px',
    fontSize: 14,
    boxSizing: 'border-box' as const,
    outline: 'none',
  },
  button: {
    width: '100%',
    background: '#8B1A2E',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '10px 0',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 8,
  },
};
