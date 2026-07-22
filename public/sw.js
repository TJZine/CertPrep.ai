const CACHE_PREFIX = "certprep-";
const PRECACHE = "certprep-precache-v5";
const RUNTIME_CACHE = "certprep-runtime-v5";
const CURRENT_CACHES = new Set([PRECACHE, RUNTIME_CACHE]);
const OFFLINE_FALLBACK = "/offline.html";
const PRECACHE_ASSETS = [
  OFFLINE_FALLBACK,
  "/offline.css",
  "/manifest.json",
  "/favicon.ico",
  "/logo-icon.svg",
  "/full-icon.svg",
  "/icons/logo-icon-180.png",
];

const ALLOWED_DESTINATIONS = new Set([
  "style",
  "script",
  "font",
  "image",
  "manifest",
]);
const STATIC_PATH_PREFIXES = ["/icons/", "/_next/static/"];

// Cache version bumping is intentionally explicit so deployments control when
// installed app-shell assets and runtime responses are invalidated.

/** @type {Set<Promise<void>>} */
const pendingRuntimeWrites = new Set();
/** @type {Promise<void> | null} */
let runtimeClearPromise = null;
let runtimeCacheGeneration = 0;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PRECACHE).then((cache) => cache.addAll(PRECACHE_ASSETS)),
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
                (name) =>
                  name.startsWith(CACHE_PREFIX) && !CURRENT_CACHES.has(name),
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

  if (request.mode === "navigate") {
    const cacheGeneration = runtimeCacheGeneration;
    const cacheAllowed = runtimeClearPromise === null;
    const networkResponse = fetch(request);
    const cacheWrite = networkResponse
      .then((response) => {
        if (!response.ok || !isCacheableNavigation(url, response)) return;
        return writeRuntimeResponse(
          request,
          response.clone(),
          cacheGeneration,
          cacheAllowed,
        );
      })
      .catch(() => undefined);

    event.waitUntil(cacheWrite);
    event.respondWith(
      networkResponse.catch(() => resolveOfflineNavigation(request)),
    );
    return;
  }

  if (!isCacheableAsset(request, url)) return;

  const cacheGeneration = runtimeCacheGeneration;
  const cacheAllowed = runtimeClearPromise === null;
  const responseRecord = caches.open(RUNTIME_CACHE).then(async (cache) => {
    const cached = await cache.match(request);
    if (cached) {
      return { response: cached, cacheWrite: undefined };
    }

    const response = await fetch(request);
    const cacheWrite = response.ok
      ? writeRuntimeResponse(
          request,
          response.clone(),
          cacheGeneration,
          cacheAllowed,
        )
      : undefined;
    return { response, cacheWrite };
  });

  event.waitUntil(
    responseRecord.then(({ cacheWrite }) => cacheWrite).catch(() => undefined),
  );
  event.respondWith(
    responseRecord
      .then(({ response }) => response)
      .catch(
        () =>
          new Response("Offline", {
            status: 503,
            statusText: "Service Unavailable",
          }),
      ),
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
    const responsePort = event.ports[0];
    const completion = clearRuntimeCache().then(
      () => replyToCacheClearRequest(responsePort, true),
      (error) => {
        console.warn("Runtime cache clear failed", error);
        replyToCacheClearRequest(responsePort, false);
      },
    );
    event.waitUntil(completion);
  }
});

/**
 * Writes a runtime response without coupling a successful network response to
 * Cache Storage availability. New writes are suppressed while destructive
 * cache clearing is in progress, and all already-started writes are tracked so
 * clearing cannot race them.
 * @param {Request} request
 * @param {Response} response
 * @param {number} generation
 * @param {boolean} allowedAtRequestStart
 * @returns {Promise<void>}
 */
function writeRuntimeResponse(
  request,
  response,
  generation,
  allowedAtRequestStart,
) {
  if (
    !allowedAtRequestStart ||
    runtimeClearPromise ||
    generation !== runtimeCacheGeneration
  ) {
    return Promise.resolve();
  }

  const writePromise = caches
    .open(RUNTIME_CACHE)
    .then((cache) => {
      if (runtimeClearPromise || generation !== runtimeCacheGeneration) {
        return;
      }
      return cache.put(request, response);
    })
    .catch((error) => {
      console.warn("Runtime cache write failed", error);
    });

  pendingRuntimeWrites.add(writePromise);
  void writePromise.then(
    () => pendingRuntimeWrites.delete(writePromise),
    () => pendingRuntimeWrites.delete(writePromise),
  );
  return writePromise;
}

/**
 * Waits for writes that started before the clear request, then deletes the
 * entire runtime cache. Calls made during the same clear share one promise.
 * @returns {Promise<void>}
 */
function clearRuntimeCache() {
  if (runtimeClearPromise) return runtimeClearPromise;

  runtimeCacheGeneration += 1;
  const clearPromise = Promise.allSettled([...pendingRuntimeWrites])
    .then(() => caches.delete(RUNTIME_CACHE))
    .then(() => undefined);

  runtimeClearPromise = clearPromise.finally(() => {
    runtimeClearPromise = null;
  });
  return runtimeClearPromise;
}

/**
 * @param {MessagePort | undefined} port
 * @param {boolean} ok
 */
function replyToCacheClearRequest(port, ok) {
  if (!port) return;
  try {
    port.postMessage({ ok });
  } catch (error) {
    console.warn("Failed to acknowledge runtime cache clear", error);
  } finally {
    port.close();
  }
}

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function resolveOfflineNavigation(request) {
  const cachedRoute = await caches.match(request, {
    cacheName: RUNTIME_CACHE,
  });
  if (cachedRoute) return cachedRoute;

  const offlineFallback = await caches.match(OFFLINE_FALLBACK, {
    cacheName: PRECACHE,
  });
  if (offlineFallback) return offlineFallback;

  return new Response("Offline", {
    status: 503,
    statusText: "Service Unavailable",
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

/**
 * @param {Request} request
 * @param {URL} url
 * @returns {boolean}
 */
function isCacheableAsset(request, url) {
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/data/")
  ) {
    return false;
  }

  if (ALLOWED_DESTINATIONS.has(request.destination)) return true;

  return STATIC_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

/**
 * @param {URL} url
 * @param {Response} response
 * @returns {boolean}
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
