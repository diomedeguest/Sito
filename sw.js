const CACHE_NAME = 'diomede-v94';

const CORE_ASSETS = [
  './assets/images/caffe_espresso.png',
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  './logo_start.png',
  './logowelcome.png',
  './sfondo.png',
  './assets/images/header.png',
  './assets/images/sfondo.png',
  './pages/menu.html',
  './pages/dettagli.html',
  './pages/contatti.html',
  './pages/regole.html',
  './pages/istruzioni.html',
  './pages/istruzioni/induzione.html',
  './pages/istruzioni/depuratore.html',
  './pages/istruzioni/cassaforte.html',
  './pages/istruzioni/idromassaggio.html',
  './pages/istruzioni/lavatrice.html',
  './pages/istruzioni/asciugatrice.html',
  './pages/istruzioni/armadio-servizio.html',
  './assets/images/armadio-servizio.png',
  './pages/wifi.html',
  './pages/trasporti.html',
  './pages/turismo.html',
  './pages/convenzioni.html',
  './pages/checkout.html',
  './assets/css/style.css',
  './pages/istruzioni/microonde.html',
  './pages/istruzioni/friggitrice.html',
  './pages/istruzioni/caffe-americano.html',
  './pages/istruzioni/caffe-espresso.html',
  './pages/istruzioni/ghiaccio.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then(r => r || caches.match('./pages/menu.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      return response;
    }))
  );
});
