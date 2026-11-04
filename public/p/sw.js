// Keeps the student player on the phone so game links open without internet.
// The game itself lives in the link (#...), which never reaches this cache or the server.
const CACHE = "ds-player-v2";
// Balloon Blast pictures; scripts/balloon-sprites.mjs keeps this list up to date.
const SPRITES = ["bg","cannon","ball","trail1","trail2","trail3","ammo1","ammo2","ammo3","ammo4","balloon-red","balloon-green","balloon-purple","balloon-yellow","pop-red-1","pop-green-1","pop-purple-1","pop-yellow-1","pop-red-2","pop-green-2","pop-purple-2","pop-yellow-2","pop-red-3","pop-green-3","pop-purple-3","pop-yellow-3"];
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", ...SPRITES.map((n) => `./balloon/${n}.webp`)];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

// Cached copy first (instant, works offline); refresh it in the background.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== location.origin) return;
  const key = url.pathname.endsWith("/") ? "./" : event.request;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(key, { ignoreSearch: true });
      const fresh = fetch(event.request)
        .then((res) => {
          if (res.ok) cache.put(key, res.clone());
          return res;
        })
        .catch(() => hit);
      return hit || fresh;
    }),
  );
});
