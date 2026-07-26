import type { Page } from "@playwright/test";

const RUNTIME_CACHE_NAME_PATTERN = /^certprep-runtime-v\d+$/;

/**
 * Treats Cache Storage as the public test surface instead of coupling E2E code
 * to the service worker's private version literal.
 */
export async function runtimeCacheContainsPaths(
  page: Page,
  paths: string[],
): Promise<boolean> {
  return page.evaluate(
    async ({ cacheNamePattern, expectedPaths }) => {
      const pattern = new RegExp(cacheNamePattern);
      const runtimeCaches = (await caches.keys()).filter((name) =>
        pattern.test(name),
      );
      if (runtimeCaches.length !== 1) return false;

      const cache = await caches.open(runtimeCaches[0]!);
      const cachedPaths = new Set(
        (await cache.keys()).map((request) => new URL(request.url).pathname),
      );
      return expectedPaths.every((path) => cachedPaths.has(path));
    },
    {
      cacheNamePattern: RUNTIME_CACHE_NAME_PATTERN.source,
      expectedPaths: paths,
    },
  );
}
