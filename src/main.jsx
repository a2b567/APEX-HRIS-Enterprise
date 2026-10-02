import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// ── One-time purge of old localStorage data cache (moved to Supabase-only) ──
try {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('dtr_payroll_database_')) {
      localStorage.removeItem(key);
    }
  });
} catch (e) {}

// NOTE: StrictMode intentionally removed — html5-qrcode camera scanner
// does not support React 18 double-invoke (mounts, unmounts, remounts).
// All components are production-safe without StrictMode.
createRoot(document.getElementById('root')).render(<App />)
