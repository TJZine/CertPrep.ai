const STATIC_CACHE = 'certprep-static-v3';
const APP_SHELL = '/'; // SPA shell - critical for offline navigation
const STATIC_ASSETS = [APP_SHELL, '/manifest.json', '/icon.svg', '/favicon.ico', '/apple-touch-icon.png'];
const STATIC_PATH_PREFIXES = ['/icons/', '/_next/static/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name.startsWith('certprep-'))
          .map((name) => caches.delete(name)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (request.url.startsWith('chrome-extension://')) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Handle navigation requests with network-first + offline fallback to app shell
  // This ensures the SPA works offline (home screen launch, refresh, deep links)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigation response as the shell
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(APP_SHELL, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline: serve cached app shell for all navigation
          return caches.match(APP_SHELL).then((cached) => {
            if (cached) return cached;
            // Ultimate fallback if shell not cached (shouldn't happen after install)
            return new Response(
              '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offline</title></head>' +
              '<body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">' +
              '<div style="text-align:center"><h1>You\'re Offline</h1><p>Please check your connection and try again.</p></div></body></html>',
              { status: 503, statusText: 'Service Unavailable', headers: { 'Content-Type': 'text/html' } }
            );
          });
        })
    );
    return;
  }

  // Static assets: cache-first strategy
  if (!isCacheableAsset(request, url)) return;

  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      } catch {
        const fallback = await cache.match(request);
        if (fallback) return fallback;
        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable',
        });
      }
    }),
  );
});

self.addEventListener('message', (event) => {
  const { data } = event;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data.type === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name.startsWith('certprep-'))
            .map((name) => caches.delete(name)),
        ),
      ),
    );
  }
});

/**
 * Determines if a request should be cached by the service worker.
 * @param {Request} request - The fetch request object
 * @param {URL} url - The parsed URL of the request
 * @returns {boolean} True if the asset should be cached
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function isCacheableAsset(request, url) {
  if (request.mode === 'navigate' || request.destination === 'document') {
    return false;
  }
  if (STATIC_ASSETS.includes(url.pathname)) {
    return true;
  }
  if (STATIC_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    return true;
  }

  const allowedDestinations = new Set(['style', 'script', 'font', 'image', 'manifest']);
  return allowedDestinations.has(request.destination);
}
