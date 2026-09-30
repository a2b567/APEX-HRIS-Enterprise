import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// NOTE: StrictMode intentionally removed — html5-qrcode camera scanner
// does not support React 18 double-invoke (mounts, unmounts, remounts).
// All components are production-safe without StrictMode.
createRoot(document.getElementById('root')).render(<App />)
