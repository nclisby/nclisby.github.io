/* ============================================================
   sw.js  —  Service Worker for Daily Schedule
   - Caches app files for offline use
   - Serves from cache immediately, updates cache in background
   - Handles background notifications
   ============================================================ */

const CACHE_NAME = "schedule-v1";
const APP_FILES  = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.svg",
];

/* ----------------------------------------------------------------
   Install — cache all app files, then activate immediately
   ---------------------------------------------------------------- */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

/* ----------------------------------------------------------------
   Activate — delete old caches, take control of all clients
   ---------------------------------------------------------------- */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

/* ----------------------------------------------------------------
   Fetch — network-first for navigation, cache-first for assets
   ---------------------------------------------------------------- */
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;
  if (event.request.method !== "GET") return;

  if (event.request.mode === "navigate") {
    // Navigation: network-first, fall back to cached index.html
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
  } else {
    // Assets: cache-first, revalidate in background
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          const networkFetch = fetch(event.request).then(response => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          }).catch(() => cached);
          return cached || networkFetch;
        })
      )
    );
  }
});

/* ----------------------------------------------------------------
   Message handler — notifications + update requests
   ---------------------------------------------------------------- */
self.addEventListener("message", event => {
  if (!event.data) return;

  if (event.data.type === "NOTIFY") {
    const { title, body } = event.data;
    event.waitUntil(
      self.registration.showNotification(title, {
        body: body || "",
        icon: "icon.svg",
        badge: "icon.svg",
        tag: "schedule-transition",
        renotify: true,
      })
    );
  }

  if (event.data.type === "CHECK_UPDATE") {
    self.registration.update();
  }

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

/* ----------------------------------------------------------------
   Notification click — bring the app to the foreground
   ---------------------------------------------------------------- */
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if ("focus" in client) return client.focus();
        }
        return self.clients.openWindow(self.registration.scope);
      })
  );
});
