/* Offline support: shell is cached on install, charts are cached as you view
   them (or all at once via the "Save all charts for offline" button). */

const SHELL = "shell-v1";
const CHARTS = "charts-v1";

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(SHELL)
      .then(c => c.addAll(["./", "./index.html", "./manifest.webmanifest", "./icon.svg"]))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== SHELL && k !== CHARTS).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  const isChart = /\.png$/i.test(new URL(req.url).pathname);

  if (isChart) {
    // Cache first — charts never change under the same filename.
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CHARTS).then(c => c.put(req, copy));
        }
        return res;
      }))
    );
    return;
  }

  // Network first for the shell, so edits show up straight away.
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(SHELL).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match("./index.html")))
  );
});
