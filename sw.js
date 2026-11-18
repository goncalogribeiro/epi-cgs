/* Service worker: guarda o app no celular para abrir sem internet.
   Ao publicar uma versão nova do index.html, troque o número abaixo
   (ex.: 'epi-cgs-v2.2') para os celulares baixarem a atualização. */
const CACHE = 'epi-cgs-v2.1';
const ARQUIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // Página: tenta a rede (pega atualização) e cai no cache se estiver offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Demais arquivos: cache primeiro
  event.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
