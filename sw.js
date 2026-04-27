// ═══════════════════════════════════════════
//  Trails Luxembourg – Service Worker v1.0
// ═══════════════════════════════════════════

const CACHE_NAME = 'trails-lu-v13';

// Fichiers à mettre en cache au démarrage
const PRECACHE = [
  '/trails-luxembourg/',
  '/trails-luxembourg/index.html',
  '/trails-luxembourg/manifest.json'
];

// ── Installation : mise en cache initiale ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ── Activation : nettoyage des vieux caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch : stratégie Cache First avec fallback réseau ──
self.addEventListener('fetch', event => {
  // Ignorer les requêtes non-GET et les requêtes externes (GPX, images GitHub...)
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Pour les fichiers GPX et images sur GitHub : réseau d'abord, pas de cache forcé
  if (url.hostname === 'raw.githubusercontent.com') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Pour tout le reste : cache d'abord, puis réseau, puis mise à jour du cache
  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request).then(response => {
        // Mettre en cache la réponse fraîche
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => null);

      // Retourner le cache immédiatement si disponible, sinon attendre le réseau
      return cached || networkFetch;
    })
  );
});
