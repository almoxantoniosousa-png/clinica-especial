const CACHE_NAME = 'clinica-abraco-v3';

// Só cacheia arquivo estático (imagem/css/fonte) — nunca página, API ou
// payload de navegação. Cachear página por URL causou um bug real: num
// aparelho compartilhado, um usuário via nome e tela de quem tinha usado
// o sistema antes ali, porque a resposta cacheada não sabe quem pediu.
const STATIC_EXT = /\.(?:png|jpg|jpeg|svg|webp|ico|css|woff2?|ttf)$/;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isStaticAsset = url.origin === self.location.origin && STATIC_EXT.test(url.pathname);
  if (!isStaticAsset) return; // deixa o navegador tratar normalmente, sempre via rede

  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});
