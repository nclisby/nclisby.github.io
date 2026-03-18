// Service Worker for Tower of Hanoi
// Cache-first with background update strategy.
//
// How it works:
//   - On install, all site files are cached.
//   - On fetch, the cached version is served immediately (fast + offline).
//   - In the background, the network version is fetched and the cache
//     is updated if the response has changed.
//   - On the next page load, the updated files are used.
//
// To trigger an update after changing any site files, bump CACHE_VERSION.

const CACHE_VERSION = 'v1';
const CACHE_NAME = 'hanoi-' + CACHE_VERSION;

const ASSETS = [
    './',
    './index.html',
    './hanoi.js',
    './site.webmanifest',
    './favicon.ico',
    './favicon.svg',
    './favicon-96x96.png',
    './apple-touch-icon.png',
    './web-app-manifest-192x192.png',
    './web-app-manifest-512x512.png'
];

// Install: cache all assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        }).then(() => {
            // Activate immediately, don't wait for old tabs to close
            return self.skipWaiting();
        })
    );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((names) => {
            return Promise.all(
                names
                    .filter((name) => name.startsWith('hanoi-') && name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => {
            // Take control of all open tabs immediately
            return self.clients.claim();
        })
    );
});

// Fetch: serve from cache, update in background
self.addEventListener('fetch', (event) => {
    // Only handle GET requests for same-origin resources
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((cachedResponse) => {
                // Start a background fetch to update the cache
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    // Only cache successful responses
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => {
                    // Network failed — that's fine, we have the cache
                });

                // Return cached version immediately, or wait for network
                return cachedResponse || fetchPromise;
            });
        })
    );
});
