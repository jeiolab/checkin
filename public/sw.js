// 캐시 버전 (Service Worker 파일이 변경되면 새 캐시 생성)
// 버전을 변경하면 모든 사용자가 새 캐시를 받게 됩니다
const CACHE_VERSION = 'v2';
const CACHE_NAME = `neungju-attendance-${CACHE_VERSION}`;
const urlsToCache = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx',
  '/manifest.json',
];

// 설치 시 캐시 저장 및 즉시 활성화
self.addEventListener('install', (event) => {
  console.log('[SW] 설치 중...', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] 캐시 생성 완료');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // 설치 완료 후 즉시 활성화 (skipWaiting)
        return self.skipWaiting();
      })
  );
});

// 활성화 시 오래된 캐시 삭제 및 클라이언트 제어
self.addEventListener('activate', (event) => {
  console.log('[SW] 활성화 중...', CACHE_NAME);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      console.log('[SW] 기존 캐시 목록:', cacheNames);
      return Promise.all(
        cacheNames.map((cacheName) => {
          // 현재 캐시가 아니면 모두 삭제
          if (!cacheName.startsWith('neungju-attendance-')) {
            return Promise.resolve();
          }
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] 오래된 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );
    }).then(() => {
      // 모든 클라이언트에 즉시 제어권 부여
      return self.clients.claim();
    })
  );
});

// 네트워크 우선, 실패 시 캐시 사용
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // chrome-extension, chrome, data 등 지원되지 않는 스킴은 캐시하지 않음
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return; // 기본 fetch 동작 사용
  }
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 성공적인 응답만 캐시에 저장
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              try {
                cache.put(event.request, responseToCache);
              } catch (error) {
                // 캐시 실패는 무시 (chrome-extension 등)
                console.warn('Cache put failed:', error);
              }
            });
        }
        return response;
      })
      .catch(() => {
        // 네트워크 실패 시 캐시에서 반환
        return caches.match(event.request);
      })
  );
});

