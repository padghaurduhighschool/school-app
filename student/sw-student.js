const CACHE_NAME = 'padgha-student-v2'; //new
const urlsToCache = [
  'student.html',
  'style.css',
  'Padgha Urdu High School Logo.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});
self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(response => response || fetch(event.request)));
});
