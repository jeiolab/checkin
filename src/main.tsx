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

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

try {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} catch (error) {
  console.error('앱 렌더링 오류:', error);
  rootElement.innerHTML = `
    <div style="padding: 20px; text-align: center;">
      <h1>앱 로드 오류</h1>
      <p>브라우저 콘솔을 확인하세요.</p>
      <pre style="text-align: left; background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto;">${error instanceof Error ? error.stack : String(error)}</pre>
    </div>
  `;
}

