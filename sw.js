// Basit hizmet çalışanı: ana ekrana eklenen uygulama için. Önce ağ (her zaman güncel sürüm), ağ yoksa önbellek.
// Not: hareket analizi modeli (MediaPipe) internetten yüklenir; ilk açılışta internet gerekir.
const CACHE = 'form-analiz-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const model = /cdn\.jsdelivr\.net|storage\.googleapis\.com/.test(url.host);
  if (!sameOrigin && !model) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // model ve wasm dosyaları büyük ve sürümlü: önbellekten (varsa), yoksa indirip sakla
    if (model) {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    }
    try {
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch {
      const hit = await cache.match(req);
      if (hit) return hit;
      throw new Error('çevrimdışı');
    }
  })());
});
