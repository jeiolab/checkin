import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { checkSecurityWarnings } from './utils/security'

// 보안 경고 확인
checkSecurityWarnings();

// Service Worker 등록 및 업데이트 감지
if ('serviceWorker' in navigator && (import.meta as any).env?.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        console.log('[SW] 등록 완료:', registration);
        
        // 업데이트 확인
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // 새 버전이 설치되었지만 아직 활성화되지 않음
                console.log('[SW] 새 버전이 설치되었습니다. 페이지를 새로고침하세요.');
                // 자동으로 새로고침 (선택사항)
                // window.location.reload();
              }
            });
          }
        });
        
        // 주기적으로 업데이트 확인 (1시간마다)
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      })
      .catch((registrationError) => {
        console.error('[SW] 등록 실패:', registrationError);
      });
    
    // Service Worker가 제어권을 가졌는지 확인
    if (navigator.serviceWorker.controller) {
      console.log('[SW] Service Worker가 제어 중입니다.');
    } else {
      console.log('[SW] Service Worker가 아직 제어하지 않습니다.');
    }
    
    // Service Worker 메시지 수신
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('[SW] 메시지 수신:', event.data);
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

