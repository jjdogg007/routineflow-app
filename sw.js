const CACHE_NAME = 'routineflow-v1'; // Increment this version number when you update cached files (HTML, CSS, JS, etc.)
const urlsToCache = [
  '/', // Caches the root path (index.html will be served for this)
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png', // Make sure these paths match your actual icon paths
  '/icons/icon-512x512.png',
  // Since your CSS and JS are embedded in index.html, they are cached with it.
  // If you add external files later (like a separate style.css or script.js),
  // make sure to add their paths here as well.
  'https://cdn-icons-png.flaticon.com/512/2927/2927063.png' // The notification icon
];

// Install event: Caches all static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('[Service Worker] Failed to cache during install:', error);
      })
  );
  self.skipWaiting(); // Forces the waiting service worker to become the active service worker
});

// Activate event: Cleans up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // Ensures the service worker takes control of existing clients immediately
});

// Fetch event: Serves cached content or fetches from network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          console.log('[Service Worker] Serving from cache:', event.request.url);
          return response;
        }

        // No cache hit - fetch from network
        console.log('[Service Worker] Fetching from network:', event.request.url);
        return fetch(event.request).then(
          (response) => {
            // Check if we received a valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and can only be consumed once. We must clone it so that
            // both the cache and the browser can consume it.
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                console.log('[Service Worker] Caching new resource:', event.request.url);
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch((error) => {
          // This catch block handles network errors
          console.error('[Service Worker] Fetch failed and no cache found:', event.request.url, error);
          // Optional: return a custom offline page here if you create one
          // For example: return caches.match('/offline.html');
          return new Response("<h1>You are offline!</h1><p>Please check your internet connection.</p>", {
            headers: { 'Content-Type': 'text/html' }
          });
        });
      })
  );
});