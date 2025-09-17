const CACHE_NAME = 'atemix-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/modules/onboarding.js',
  '/modules/catalogo.js',
  '/modules/planeacion.js',
  '/modules/gradebook.js',
  '/modules/rubricas.js',
  '/modules/diario.js',
  '/modules/insignias.js',
  '/modules/recursos.js',
  '/modules/scanner.js',
  '/modules/asientos.js',
  '/modules/aula.js',
  '/modules/backup.js',
  '/modules/export_xls.js',
  '/modules/planner.js',
  '/modules/progreso.js',
  '/modules/reportes.js',
  '/modules/visor.js',
  '/assets/atemi-iso.svg',
  '/assets/atemi-logo.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
