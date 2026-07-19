const STATIC_CACHE = "certprep-static-v4";
const OFFLINE_FALLBACK = "/offline.html";
const STATIC_ASSETS = [
  "/",
  OFFLINE_FALLBACK,
  "/offline.css",
  "/manifest.json",
  "/favicon.ico",
  "/logo-icon.svg",
  "/full-icon.svg",
  "/icons/logo-icon-180.png",
];

// Cacheable destination types and path prefixes
const ALLOWED_DESTINATIONS = new Set([
  "style",
  "script",
  "font",
  "image",
  "manifest",
]);
const STATIC_PATH_PREFIXES = ["/icons/", "/_next/static/"];

// NOTE: Cache version bumping is currently manual.
// Future Improvement: Integrate with build script to auto-increment on deployment.

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((cacheNames) =>
          Promise.all(
            cacheNames
              .filter(
                (name) => name !== STATIC_CACHE && name.startsWith("certprep-"),
              )
              .map((name) => caches.delete(name)),
          ),
        ),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (request.url.startsWith("chrome-extension://")) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Cache successful documents by their exact URL. Serving an arbitrary cached
  // route as another URL gives Next.js the wrong server-rendered payload and
  // causes route/hydration mismatches.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok && isCacheableNavigation(url, response)) {
            const clone = response.clone();
            const cache = await caches.open(STATIC_CACHE);
            await cache.put(request, clone);
          }
          return response;
        })
        .catch(async () => {
          const cachedRoute = await caches.match(request);
          if (cachedRoute) return cachedRoute;

          const offlineFallback = await caches.match(OFFLINE_FALLBACK);
          if (offlineFallback) return offlineFallback;

          return new Response("Offline", {
            status: 503,
            statusText: "Service Unavailable",
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }),
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
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        return new Response("Offline", {
          status: 503,
          statusText: "Service Unavailable",
        });
      }
    }),
  );
});

self.addEventListener("message", (event) => {
  const { data } = event;
  if (!data || typeof data !== "object") return;

  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (data.type === "CLEAR_CACHES") {
    event.waitUntil(
      caches
        .keys()
        .then((cacheNames) =>
          Promise.all(
            cacheNames
              .filter((name) => name.startsWith("certprep-"))
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
function isCacheableAsset(request, url) {
  // Don't cache API calls or Next.js data
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/data/")
  )
    return false;

  // Cache based on destination
  if (ALLOWED_DESTINATIONS.has(request.destination)) return true;

  // Cache based on path prefix (e.g. icons, static chunks)
  return STATIC_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

/**
 * Avoid persisting authentication documents or callback query parameters.
 * @param {URL} url - The requested navigation URL
 * @param {Response} response - The successful network response
 * @returns {boolean} True when the document can be cached by exact URL
 */
function isCacheableNavigation(url, response) {
  const sensitivePrefixes = [
    "/auth/",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
  ];

  if (sensitivePrefixes.some((prefix) => url.pathname.startsWith(prefix))) {
    return false;
  }

  return response.headers.get("content-type")?.includes("text/html") ?? false;
}
