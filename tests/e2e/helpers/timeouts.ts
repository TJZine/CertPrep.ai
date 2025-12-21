/**
 * Shared timeout constants for E2E tests.
 *
 * These values are calibrated for CI environment variability (GitHub Actions).
 * Local runs typically complete much faster, but CI can have unpredictable I/O.
 *
 * Before reducing these values, run Playwright with `--trace on` to profile
 * actual timing needs across multiple CI runs.
 */
export const E2E_TIMEOUTS = {
    /**
     * Standard loading state timeout.
     * Covers: IndexedDB initialization, component render, initial data fetch.
     */
    LOADING: 15_000,

    /**
     * Extended timeout for quiz hydration with potential sync.
     * Covers: Large quiz loading, aggregated quiz building, sync operations.
     */
    HYDRATION: 20_000,

    /**
     * Animation completion timeout.
     * Covers: Framer Motion score counters, transition effects.
     */
    ANIMATION: 10_000,
} as const;

export type E2ETimeoutKey = keyof typeof E2E_TIMEOUTS;
