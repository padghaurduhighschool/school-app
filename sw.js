const CACHE_NAME = 'school-app-v1';
const ASSETS = [
  'index.html',
  'app.js',
  'Padgha Urdu High School Logo.png',
];

self.addEventListener('install', (e) => {
  self.skipWaiting(); // ✅ activate immediately
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Activate
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key); // 🧹 delete old cache
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
