// SERVICE WORKER (deprecated: lokale opslag uitgezet)
const CACHE_NAME = 'mediawegwijs-v6.0-deprecated';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request, { cache: 'no-store' }));
});
