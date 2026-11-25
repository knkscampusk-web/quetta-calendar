// QUETTA 학사일정 Service Worker
// 캐시 버전 — 코드 수정 후 배포 시 이 숫자를 올리면 모든 클라이언트가 새 버전 사용
const CACHE = 'quetta-cal-v1';

// 설치 시 미리 캐시할 정적 자산
const STATIC = [
  './',
  './parent.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(STATIC).catch(() => {}))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Firebase 관련 호스트는 항상 네트워크 (실시간 데이터)
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firebaseapp.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('google.com') ||
    url.hostname.includes('firebase')
  ) {
    return;
  }
  // 그 외: 캐시 우선, 없으면 네트워크 + 캐시 저장
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        // 백그라운드로 업데이트 시도 (stale-while-revalidate)
        fetch(req).then((resp) => {
          if (resp && resp.status === 200) {
            caches.open(CACHE).then((c) => c.put(req, resp));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(req).then((resp) => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, clone));
        }
        return resp;
      }).catch(() => cached);
    })
  );
});
