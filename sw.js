/* Service worker: guarda o app no celular para abrir sem internet.
   Ao publicar uma versão nova do index.html, troque o número abaixo
   (ex.: 'epi-cgs-v2.2') para os celulares baixarem a atualização. */
const CACHE = 'epi-cgs-v2.4';
const ESPERA_REDE_MS = 3000;   // com sinal fraco, abre pela cópia guardada após 3 s
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

  // Página: tenta a rede (pega atualização), mas não espera mais que ESPERA_REDE_MS.
  // Se a rede demorar ou falhar, abre a cópia guardada; a rede continua baixando
  // em segundo plano e atualiza a cópia para a próxima abertura.
  if (req.mode === 'navigate') {
    const rede = fetch(req).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy));
      }
      return res;
    });
    event.waitUntil(rede.catch(() => {}));
    event.respondWith((async () => {
      const guardada = await caches.match('./index.html');
      if (!guardada) return rede;                       // primeira vez: precisa da rede
      return Promise.race([
        rede.then(res => (res.ok ? res : guardada)).catch(() => guardada),
        new Promise(r => setTimeout(() => r(guardada), ESPERA_REDE_MS))
      ]);
    })());
    return;
  }

  // Demais arquivos: cache primeiro
  event.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
