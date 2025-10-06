/* service-worker.js — v1 Offline básico (same-origin GET) */
const CACHE = 'resguardo-cache-v1';
const PRECACHE = [
  './',
  './index.html',
  './menu.html',
  './tipo.html',
  './contactos.html',
  './evidencia-ejercicios.html',
  './reporte-incidencias.html',
  './formulario.html',
  './formulario-conductor.html',
  './styles.css',
  './menu.css',
  './tipo.css',
  './contacts.css',
  './ejercicios.css',
  './evidencia-ejercicios.css',
  './script.js',
  './menu.js',
  './tipo.js',
  './contacts.js',
  './reporte-incidencias.js',
  './evidencia-ejercicios.js',
  './formulario.js',
  './formulario-conductor.js',
  './firebase-config.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(PRECACHE);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE) && caches.delete(k)));
    self.clients.claim();
  })());
});

// Estrategia: cache-first para same-origin GET; fallback a cache si offline.
// Deja pasar peticiones a Firestore/Storage/CDN sin interceptarlas.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return;
  if (url.origin !== location.origin) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    if (cached) return cached;

    try {
      const fresh = await fetch(req);
      // cache sólo respuestas válidas
      if (fresh && fresh.ok) cache.put(req, fresh.clone());
      return fresh;
    } catch (_){
      // Fallback: si pidió un HTML y no hay red, sirve menú como “shell”
      if (req.headers.get('accept')?.includes('text/html')) {
        const shell = await cache.match('./menu.html') || await cache.match('./index.html');
        if (shell) return shell;
      }
      // o entrega lo que haya
      if (cached) return cached;
      throw _;
    }
  })());
});
