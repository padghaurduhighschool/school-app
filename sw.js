const CACHE_NAME = 'school-app-v1';
const ASSETS = [
  '/school-app/',
  '/school-app/index.html',
  '/school-app/app.js',
  '/school-app/style.css',
  '/school-app/Padgha Urdu High School Logo.png'
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
    caches.match(e.request).then((res) => {
      return res || fetch(e.request).then((response) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, response.clone());
          return response;
        });
      });
    }).catch(() => {
      // fallback if offline
      if (e.request.mode === 'navigate') {
        return caches.match('index.html');
      }
    })
  );
});
