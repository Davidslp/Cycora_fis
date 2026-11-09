/**
 * CYCORA - SERVICE WORKER (PWA)
 * Estrategia de caché para que la demo funcione offline e instalable.
 *
 * - App shell (HTML/CSS/JS/íconos): cache-first (carga instantánea offline).
 * - Resto de peticiones (p. ej. fuentes de Google): network-first con respaldo en caché.
 *
 * IMPORTANTE: al cambiar los archivos del app shell, sube CACHE_VERSION
 * para que los navegadores descarten la caché vieja.
 */
const CACHE_VERSION = 'cycora-v3';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon.svg'
];

// Instalación: precachea el app shell.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activación: elimina cachés de versiones anteriores.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: solo gestionamos peticiones GET.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isAppShell = url.origin === self.location.origin;

  if (isAppShell) {
    // Cache-first para los recursos propios de la app.
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        });
      })
    );
    return;
  }

  // Network-first para recursos externos (fuentes, etc.), con respaldo en caché.
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request))
  );
});
