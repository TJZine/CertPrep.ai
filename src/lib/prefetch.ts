/**
 * Prefetch dynamic imports during browser idle time.
 * 
 * Features:
 * - SSR-guarded (safe to call from useEffect)
 * - Deduplicates to prevent repeated prefetches on re-renders
 * - Uses requestIdleCallback with setTimeout fallback
 * 
 * @example
 * useEffect(() => {
 *   prefetchOnIdle([
 *     { key: 'ImportModal', load: () => import('@/components/dashboard/ImportModal') },
 *   ]);
 * }, []);
 */

const prefetched = new Set<string>();

interface PrefetchItem {
    key: string;
    load: () => Promise<unknown>;
}

/**
 * Prefetch dynamic imports during browser idle time.
 * Safe to call from useEffect (SSR-guarded).
 * Deduplicates to prevent repeated prefetches on re-renders.
 */
export function prefetchOnIdle(imports: PrefetchItem[]): void {
    // SSR guard
    if (typeof window === 'undefined') return;

    // Filter already-prefetched
    const pending = imports.filter(({ key }) => !prefetched.has(key));
    if (pending.length === 0) return;

    const doPrefetch = (): void => {
        pending.forEach(({ key, load }) => {
            prefetched.add(key);
            load().catch(() => {
                // Remove from set so retry is possible on next call
                prefetched.delete(key);
            });
        });
    };

    // Use requestIdleCallback if available, otherwise setTimeout fallback
    if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(doPrefetch, { timeout: 3000 });
    } else {
        setTimeout(doPrefetch, 1000);
    }
}
