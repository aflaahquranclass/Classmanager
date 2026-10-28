// Service worker: makes the app installable, lets the app shell open fast /
// offline, and shows phone notifications sent by the Worker (/api/push). It only ever touches same-origin GET requests, so
// Supabase (auth + data) and Google Fonts always go straight to the network.
const VERSION = "v3";
const SHELL_CACHE = `aflaah-shell-${VERSION}`;
const ASSET_CACHE = `aflaah-assets-${VERSION}`;
const SHELL_URLS = ["/", "/manifest.webmanifest", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => Promise.all(SHELL_URLS.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Page loads: always try the network first so a new deploy shows up
  // immediately; fall back to the cached shell when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() => caches.match("/"))
    );
    return;
  }

  // Built assets (hashed filenames), images, icons and fonts: cache first.
  if (/^\/(assets|images|icons|fonts)\//.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          // A missing asset comes back as the app's index.html (SPA fallback);
          // never cache that in place of a script or image.
          const isHtml = (response.headers.get("Content-Type") || "").includes("text/html");
          if (response.ok && !isHtml) {
            const copy = response.clone();
            caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
  }
});

// Phone notifications: shown in the notification center even when the app is
// closed. Payload: { title, body, tag, url } (worker/push.js).
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }
  const portal = self.location.hostname.split(".")[0];
  const icon = portal === "admin" ? "/icons/admin-icon-192.png" : "/icons/icon-192.png";
  event.waitUntil(Promise.all([
    self.registration.showNotification(data.title || "Aflaah Quran Class", {
      body: data.body || "",
      icon,
      badge: "/icons/badge-96.png",
      tag: data.tag,
      dir: "auto",
      data: { url: data.url || "/" },
    }),
    // Red dot / count on the home-screen icon, where the phone supports it.
    self.navigator && self.navigator.setAppBadge ? self.navigator.setAppBadge().catch(() => {}) : null,
  ]));
});

// Tapping a notification opens the app (or brings it to the front).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const win = wins.find((w) => w.url.startsWith(self.location.origin));
      if (win) return win.focus().then((w) => (w && w.postMessage({ type: "notification-open" }), w));
      return self.clients.openWindow(url);
    })
  );
});
