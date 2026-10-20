// Service worker du site web de la suite (GitHub Pages ; inscrit par shared/github_data.js quand l'accès aux données
// GitHub est réglé) : copie hors ligne du code de la suite — réseau d'abord, dernière copie sinon. Les données
// (data/…) ne passent pas par ici : lues dans la page par shared/github_data.js (fetch détourné, lectures synchrones),
// ce qui vaut aussi dans l'appli iOS, sans service worker.
'use strict';
const SCOPE = new URL(self.registration.scope);
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const req = e.request,
    url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname) || url.pathname.startsWith(
      `${SCOPE.pathname}data/`)) return;
  e.respondWith((async () => {
    const cache = await caches.open('sog-app');
    try {
      const r = await fetch(req);
      if (r.ok && r.type === 'basic') await cache.put(req, r.clone());
      return r;
    } catch {
      return (await cache.match(req)) || (await cache.match(req, {
        ignoreSearch: true
      })) || Response.error();
    }
  })());
});
