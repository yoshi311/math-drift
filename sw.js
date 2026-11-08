// Service Worker：オフライン対応（キャッシュを返しつつ裏で最新に更新）
const CACHE = 'mathdrift-v3';
const CORE = ['./', './index.html', './manifest.webmanifest', './css/base.css', './css/components.css', './css/screens.css', './js/main.js', './icons/icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === location.origin;
  const font = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!same && !font) return;
  // ネットワーク優先（常に最新）。つながらない・遅いときはキャッシュを使う
  e.respondWith(caches.open(CACHE).then(async cache => {
    const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; });
    const timeout = new Promise(r => setTimeout(r, 4000));
    try {
      const res = await Promise.race([net, timeout]);
      if (res) return res;
    } catch {}
    const cached = await cache.match(req, { ignoreSearch: same });
    return cached || net;
  }));
});
