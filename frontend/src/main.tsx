import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const globalStyles = document.createElement('style');
globalStyles.textContent = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Malgun Gothic', sans-serif;
    background: #f4f6fa;
    color: #1f2937;
    -webkit-font-smoothing: antialiased;
  }
  input:focus, select:focus, textarea:focus {
    border-color: #4f6ef7 !important;
    box-shadow: 0 0 0 3px rgba(79,110,247,0.12);
    outline: none;
  }
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 8px; }

  @keyframes bdc-spin { to { transform: rotate(360deg); } }
  @keyframes bdc-spin-rev { to { transform: rotate(-360deg); } }
  @keyframes bdc-twinkle { 0%, 100% { opacity: 0.35; } 50% { opacity: 1; } }
  @keyframes bdc-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
  @keyframes bdc-reveal { from { opacity: 0; transform: scale(0.82); } to { opacity: 1; transform: scale(1); } }
  @keyframes bdc-pulse { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 0.9; transform: scale(1.08); } }

  /* ===== 레이아웃 반응형 ===== */
  .bdc-main { margin-left: 210px; padding: 28px 32px; }
  .bdc-topbar { display: none; }
  .bdc-overlay { display: none; }
  .bdc-statgrid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }
  .bdc-login-card { width: 400px; max-width: 92vw; }

  @media (max-width: 900px) {
    .bdc-main { margin-left: 0; padding: 70px 14px 20px; }
    .bdc-topbar {
      display: flex; align-items: center; gap: 12px;
      position: fixed; top: 0; left: 0; right: 0; height: 54px; z-index: 90;
      background: #fff; border-bottom: 1px solid #e5e7eb; padding: 0 14px;
    }
    .bdc-sidebar { transform: translateX(-100%); transition: transform .25s ease; z-index: 120; }
    .bdc-sidebar.open { transform: translateX(0); box-shadow: 0 0 40px rgba(0,0,0,.25); }
    .bdc-overlay.show { display: block; position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 110; }
    .bdc-statgrid { grid-template-columns: repeat(3, 1fr); gap: 10px; }
  }
  @media (max-width: 520px) {
    .bdc-statgrid { grid-template-columns: repeat(2, 1fr); }
    .bdc-main { padding: 66px 10px 18px; }
  }
`;
document.head.appendChild(globalStyles);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
