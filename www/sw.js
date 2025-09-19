self.addEventListener("install", (event) => {
  console.log("Service Worker instalado");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker activo");
  clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Por ahora solo deja pasar todo
});