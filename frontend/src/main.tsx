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
`;
document.head.appendChild(globalStyles);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
