import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const globalStyles = document.createElement('style');
globalStyles.textContent = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f3f4f6;
    color: #111827;
    -webkit-font-smoothing: antialiased;
  }
  input:focus, select:focus, textarea:focus {
    border-color: #8B1A2E !important;
    outline: none;
  }
`;
document.head.appendChild(globalStyles);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
