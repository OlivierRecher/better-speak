/* Service worker : fonctionnement hors ligne.
   Stratégie « réseau d'abord, cache en secours » : on évite ainsi le décalage de versions
   (JS neuf servi avec un CSS périmé) qui rend une PWA très difficile à mettre à jour.
   Hors ligne, le cache prend le relais et l'application reste complètement utilisable. */
const CACHE = 'clair-v2';
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './css/styles.css',
  './js/app.js', './js/store.js', './js/content.js', './js/audio.js',
  './js/analysis.js', './js/ui.js', './js/exercise.js',
  './assets/icon.svg', './assets/icon-maskable.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(request)
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(request, copy));
        }
        return res;
      })
      .catch(() => caches.match(request).then(hit => hit || caches.match('./index.html')))
  );
});
