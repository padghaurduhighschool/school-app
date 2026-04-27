const CACHE_NAME = 'school-app-v1';
const ASSETS = [
  'index.html',
  'app.js',
  'Padgha Urdu High School Logo.jpg',
  'https://cdn.tailwindcss.com'
];

// Install Service Worker
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Fetch Assets from Cache
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
