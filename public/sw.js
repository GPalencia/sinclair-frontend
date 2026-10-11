// Service worker de SinclairApp.
// Objetivo: que la app sea instalable y abra rápido. NO guarda datos del negocio:
// las llamadas a la API nunca se interceptan, así que siempre van al servidor.
//
// Para forzar que todos descarguen una versión nueva del caché, sube el número de VERSION.
const VERSION = 'v1';
const CACHE = `sinclairapp-${VERSION}`;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Solo archivos de la propia app (Netlify). El backend (Render), face-api (CDN), mapas, etc. no se tocan.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api')) return;

  // Pantallas: primero la red (siempre la versión más nueva); sin internet, la última guardada
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copia = res.clone();
          caches.open(CACHE).then(c => c.put('/index.html', copia));
          return res;
        })
        .catch(() => caches.match('/index.html').then(r => r || new Response(
          '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
          '<body style="font-family:sans-serif;text-align:center;padding:3rem 1rem">' +
          '<h2>Sin conexión</h2><p>Revisa tu internet y vuelve a abrir la app.</p></body>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )))
    );
    return;
  }

  // Archivos de la app (js/css/imágenes/modelos de reconocimiento facial): del caché si ya están, si no se descargan y se guardan
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
      return res;
    }))
  );
});
