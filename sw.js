// sw.js: lets the installed web app (and the web page) open and play offline. Registered by game.js only on the web,
// never inside YouTube Playables or the Android app. Pages are network-first (updates arrive at once); the versioned
// scripts, font and icons are cache-first. Bump VERSION together with the ?v= numbers in index.html.
const VERSION = 4;
const CACHE = 'laddoo-chor-v' + VERSION;
const CORE = ['./', './index.html', `./draw.js?v=${VERSION}`, `./audio.js?v=${VERSION}`, `./game.js?v=${VERSION}`,
  './LilitaOne.woff2', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;     // the YouTube SDK etc. go straight out
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy));
      return res;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
