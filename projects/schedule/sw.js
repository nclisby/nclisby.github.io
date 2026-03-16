/* ============================================================
   sw.js  —  Service Worker for Daily Schedule
   Handles background push-style notifications via postMessage.
   ============================================================ */

const SW_VERSION = "schedule-sw-v1";

/* ----------------------------------------------------------------
   Install & Activate — take control immediately, no waiting
   ---------------------------------------------------------------- */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

/* ----------------------------------------------------------------
   Message handler
   The main page posts { type: "NOTIFY", title, body } when a
   schedule transition occurs. The SW shows the notification so it
   appears even when the page is backgrounded or the screen locked.
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
        tag: "schedule-transition",   // replace previous notification
        renotify: true,               // vibrate/sound even if replacing same tag
      })
    );
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
        // If a window is already open, focus it
        for (const client of clientList) {
          if ("focus" in client) return client.focus();
        }
        // Otherwise open a new window
        return self.clients.openWindow(self.registration.scope);
      })
  );
});
