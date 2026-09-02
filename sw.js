const CACHE = "lumora-forex-v6";
const ASSETS = ["/","/index.html","/style.css","/app.js","/manifest.webmanifest","/icons/icon-192.png","/icons/icon-512.png"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.pathname === "/api/market") {
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});

self.addEventListener("message", event => {
  if (!event.data || event.data.type !== "LUMORA_GOOD_TO_TRADE") return;
  event.waitUntil(self.registration.showNotification("Lumora — GOOD TO TRADE", {
    body: event.data.body || "Market conditions meet the current dashboard criteria.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "lumora-good-to-trade",
    renotify: true,
    vibrate: [200,100,200]
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({type:"window", includeUncontrolled:true}).then(list => {
    for (const client of list) if ("focus" in client) return client.focus();
    if (clients.openWindow) return clients.openWindow("/");
  }));
});
