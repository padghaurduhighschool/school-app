const CACHE_NAME = 'padgha-student-v2';
const urlsToCache = [
  'student.html',
  'style.css',
  'Padgha Urdu High School Logo.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

// Handle notification clicks (even if not using push, this prevents errors)
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return clients.openWindow('/student/student.html');
      })
  );
});
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
        // Optionally claim clients to take control immediately
        event.waitUntil(clients.claim());
    }
});
// Import Firebase scripts into the Service Worker
importScripts('https://www.gstatic.com/firebasejs/9.6.10/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.10/firebase-messaging-compat.js');

// Initialize Firebase in the Service Worker
firebase.initializeApp({
    apiKey: "AIzaSyAatxuUMNJ2lK-jdWLNaugF-tNXElOcrUs",
    authDomain: "padgha-school-erp.firebaseapp.com",
    databaseURL: "https://padgha-school-erp-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "padgha-school-erp",
    storageBucket: "padgha-school-erp.firebasestorage.app",
    messagingSenderId: "481255456109",
    appId: "1:481255456109:web:077e656f3dd03aee43ae64"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: 'Padgha Urdu High School Logo.png',
    badge: 'Padgha Urdu High School Logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// KEEP YOUR EXISTING CACHE AND FETCH LOGIC BELOW THIS...
