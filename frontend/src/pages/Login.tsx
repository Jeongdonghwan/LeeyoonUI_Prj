import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { colors } from '../styles/theme';
import { IconStar, IconEye, IconEyeOff } from '../components/common/icons';
import toast from 'react-hot-toast';

// 북두칠성(큰곰자리 국자) 7성 — 500x500 중앙 기준
const STARS = [
  { x: 160, y: 175, r: 5 }, { x: 195, y: 260, r: 4.5 }, { x: 285, y: 280, r: 4.5 },
  { x: 275, y: 195, r: 4 }, { x: 360, y: 205, r: 4.8 }, { x: 425, y: 235, r: 4.4 },
  { x: 480, y: 300, r: 5.5 },
];
const LINES = [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]];
const ORBIT_DOTS = [
  { ring: 150, deg: 20 }, { ring: 150, deg: 200 }, { ring: 200, deg: 110 },
  { ring: 200, deg: 300 }, { ring: 235, deg: 60 }, { ring: 235, deg: 250 },
];
const DUST = [
  [60, 60], [90, 430], [430, 70], [470, 430], [40, 250], [250, 40], [250, 470],
  [140, 110], [380, 400], [110, 380], [400, 130], [200, 90], [300, 430], [70, 180], [440, 300],
];
const polar = (cx: number, cy: number, r: number, deg: number) => ({
  x: cx + r * Math.cos((deg * Math.PI) / 180),
  y: cy + r * Math.sin((deg * Math.PI) / 180),
});

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const saved = localStorage.getItem('bdc_saved_id');
    if (saved) { setUsername(saved); setRemember(true); }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) { toast.error('아이디와 비밀번호를 입력해주세요.'); return; }
    setLoading(true);
    try {
      const res = await login(username.trim(), password);
      if (remember) localStorage.setItem('bdc_saved_id', username.trim());
      else localStorage.removeItem('bdc_saved_id');
      setAuth(res.data.data.access_token, res.data.data.user);
      toast.success('로그인 되었습니다.');
      navigate('/campaigns');
    } catch (err: any) {
      toast.error(err.response?.data?.message || '로그인에 실패했습니다.');
    } finally { setLoading(false); }
  };

  return (
    <div style={styles.wrapper}>
      {/* 전체화면 별자리 배경 */}
      <svg style={styles.bg} viewBox="0 0 500 500" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#8b9cff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#5b6ef5" stopOpacity="0" />
          </radialGradient>
        </defs>
        {DUST.map(([x, y], i) => (
          <circle key={`d${i}`} cx={x} cy={y} r={i % 3 === 0 ? 1.8 : 1.1} fill="#cdd6ff"
            style={{ animation: `bdc-twinkle ${2.5 + (i % 5) * 0.6}s ease-in-out ${i * 0.2}s infinite` }} />
        ))}
        <circle cx="250" cy="250" r="95" fill="url(#coreGlow)"
          style={{ transformBox: 'view-box', transformOrigin: '250px 250px', animation: 'bdc-pulse 5s ease-in-out infinite' }} />
        <g style={{ transformBox: 'view-box', transformOrigin: '250px 250px', animation: 'bdc-spin 60s linear infinite' }}>
          <circle cx="250" cy="250" r="150" fill="none" stroke="#5f6bd6" strokeOpacity="0.32" strokeWidth="1" strokeDasharray="2 8" />
        </g>
        <g style={{ transformBox: 'view-box', transformOrigin: '250px 250px', animation: 'bdc-spin-rev 45s linear infinite' }}>
          <circle cx="250" cy="250" r="200" fill="none" stroke="#7c86e6" strokeOpacity="0.26" strokeWidth="1" strokeDasharray="1 10" />
        </g>
        <g style={{ transformBox: 'view-box', transformOrigin: '250px 250px', animation: 'bdc-spin 90s linear infinite' }}>
          <circle cx="250" cy="250" r="235" fill="none" stroke="#8b5cf6" strokeOpacity="0.2" strokeWidth="1" />
          {ORBIT_DOTS.map((o, i) => { const p = polar(250, 250, o.ring, o.deg); return <circle key={`o${i}`} cx={p.x} cy={p.y} r="3" fill="#aab6ff" opacity="0.8" />; })}
        </g>
        <g style={{ transformBox: 'view-box', transformOrigin: '250px 250px', animation: 'bdc-float 7s ease-in-out infinite' }}>
          {LINES.map(([a, b], i) => (
            <line key={`l${i}`} x1={STARS[a].x} y1={STARS[a].y} x2={STARS[b].x} y2={STARS[b].y} stroke="#aab6ff" strokeWidth="1.4" strokeOpacity="0.6" />
          ))}
          {STARS.map((s, i) => (
            <g key={`s${i}`} style={{ animation: `bdc-twinkle ${3 + (i % 3)}s ease-in-out ${i * 0.3}s infinite` }}>
              <circle cx={s.x} cy={s.y} r={s.r * 3.4} fill="url(#starGlow)" />
              <circle cx={s.x} cy={s.y} r={s.r} fill="#fff" />
            </g>
          ))}
        </g>
      </svg>

      {/* 정중앙 로그인 카드 */}
      <div style={styles.center}>
        <form onSubmit={handleSubmit} className="bdc-login-card" style={styles.card}>
          <div style={styles.brandRow}>
            <IconStar size={30} color={colors.primary} />
            <h1 style={styles.title}>북두칠성</h1>
          </div>

          <div style={styles.greeting}>
            <div style={styles.greetingTitle}>안녕하세요, 북두칠성입니다.</div>
            <div style={styles.greetingSub}>플레이스 광고 서비스 이용을 위해 로그인 해주세요.</div>
          </div>

          <label style={styles.label}>아이디</label>
          <input style={styles.input} type="text" value={username} autoFocus
            onChange={(e) => setUsername(e.target.value)} placeholder="아이디를 입력하세요" />

          <label style={{ ...styles.label, marginTop: 16 }}>비밀번호</label>
          <div style={{ position: 'relative' }}>
            <input style={{ ...styles.input, paddingRight: 42 }} type={showPw ? 'text' : 'password'}
              value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호를 입력하세요" />
            <button type="button" onClick={() => setShowPw((v) => !v)} style={styles.eye} tabIndex={-1}>
              {showPw ? <IconEyeOff size={18} color={colors.textMuted} /> : <IconEye size={18} color={colors.textMuted} />}
            </button>
          </div>

          <label style={styles.remember}>
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            아이디 기억하기
          </label>

          <button type="submit" style={{ ...styles.button, opacity: loading ? 0.6 : 1 }} disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'fixed', inset: 0, overflow: 'hidden',
    background: 'radial-gradient(120% 100% at 50% 30%, #26305c 0%, #141a38 48%, #070a1a 100%)',
  },
  bg: { position: 'absolute', inset: 0, width: '100%', height: '100%' },
  center: {
    position: 'relative', zIndex: 2, width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  card: {
    background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(6px)',
    borderRadius: 16, padding: '34px 30px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
    animation: 'bdc-reveal 0.7s cubic-bezier(0.22,1,0.36,1) both',
  },
  brandRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, marginBottom: 22 },
  title: { fontSize: 26, fontWeight: 800, color: colors.text },
  greeting: { background: colors.surfaceAlt, border: `1px solid ${colors.border}`, borderRadius: 10, padding: '14px 16px', marginBottom: 24 },
  greetingTitle: { fontSize: 14, fontWeight: 700, color: colors.text },
  greetingSub: { fontSize: 12.5, color: colors.textMuted, marginTop: 5 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text },
  input: { width: '100%', border: `1px solid ${colors.borderStrong}`, borderRadius: 8, padding: '11px 12px', fontSize: 14, boxSizing: 'border-box', outline: 'none', background: '#fff' },
  eye: { position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4 },
  remember: { display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: colors.textMuted, margin: '16px 0 20px', cursor: 'pointer' },
  button: { width: '100%', background: colors.primaryGradient, color: '#fff', border: 'none', borderRadius: 8, padding: '12px 0', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(91,110,245,0.3)' },
};
