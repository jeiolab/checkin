import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { checkSecurityWarnings } from './utils/security'

// 보안 경고 확인
checkSecurityWarnings();

// Service Worker 등록
if ('serviceWorker' in navigator && (import.meta as any).env?.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

