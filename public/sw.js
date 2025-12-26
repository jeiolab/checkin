const CACHE_NAME = 'neungju-attendance-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx',
  '/manifest.json',
];

// 설치 시 캐시 저장
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// 활성화 시 오래된 캐시 삭제
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
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

