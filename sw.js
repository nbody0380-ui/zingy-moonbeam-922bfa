const CACHE = "mbbs-command-center-v3";
const APP_CACHES = ["mbbs-command-center-"];

const FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => APP_CACHES.some(prefix => key.startsWith(prefix)) && key !== CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);

    try {
      // Prefer the latest deployed file so installed PWAs receive updates.
      const response = await fetch(request);

      if (response && response.ok) {
        await cache.put(request, response.clone());
      }

      return response;
    } catch (error) {
      const cached = await cache.match(request);
      if (cached) return cached;

      // Keep the app shell available when offline on a page navigation.
      if (request.mode === "navigate") {
        const appShell = await cache.match("./index.html");
        if (appShell) return appShell;
      }

      return new Response("You are offline. Please reconnect and try again.", {
        status: 503,
        statusText: "Offline"
      });
    }
  })());
});
