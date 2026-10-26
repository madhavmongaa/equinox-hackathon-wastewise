// WasteWise service worker: lets the installed app open without a connection.
// Pages and built files are network-first with a cached copy as the fallback;
// API calls are never cached (the app queues scans itself while offline).

const CACHE = "wastewise-v1"
const SHELL = ["/app.html", "/favicon.svg", "/manifest.webmanifest", "/icons/icon-192.png"]

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const req = event.request
  const url = new URL(req.url)
  if (req.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy))
        }
        return res
      })
      .catch(async () => (await caches.match(req)) ?? (req.mode === "navigate" ? caches.match("/app.html") : Response.error()))
  )
})
