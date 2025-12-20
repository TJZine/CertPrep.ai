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
 *
 * @returns Cleanup function to cancel pending prefetch. Use in useEffect cleanup.
 * @example
 * useEffect(() => {
 *   return prefetchOnIdle([
 *     { key: 'Modal', load: () => import('@/components/Modal') },
 *   ]);
 * }, []);
 */
export function prefetchOnIdle(imports: PrefetchItem[]): () => void {
    // SSR guard - return no-op cleanup
    if (typeof window === 'undefined') return () => { };

    // Filter already-prefetched
    const pending = imports.filter(({ key }) => !prefetched.has(key));
    if (pending.length === 0) return () => { };

    let cancelled = false;

    const doPrefetch = (): void => {
        if (cancelled) return;
        pending.forEach(({ key, load }) => {
            prefetched.add(key);
            load().catch(() => {
                // Remove from set so retry is possible on next call
                prefetched.delete(key);
            });
        });
    };

    // Use requestIdleCallback if available, otherwise setTimeout fallback
    let idleHandle: number | undefined;
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    if (typeof window.requestIdleCallback === 'function') {
        idleHandle = window.requestIdleCallback(doPrefetch, { timeout: 3000 });
    } else {
        timeoutHandle = setTimeout(doPrefetch, 1000);
    }

    // Return cleanup function
    return (): void => {
        cancelled = true;
        if (idleHandle !== undefined && typeof window.cancelIdleCallback === 'function') {
            window.cancelIdleCallback(idleHandle);
        }
        if (timeoutHandle !== undefined) {
            clearTimeout(timeoutHandle);
        }
    };
}
