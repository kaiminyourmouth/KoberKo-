import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { runDataAudit } from './utils/dataAudit.js';
import { runAccuracyTests } from './tests/accuracy.test.js';

if (import.meta.env.DEV) {
  runDataAudit();
  window.setTimeout(() => runAccuracyTests(), 1000);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
