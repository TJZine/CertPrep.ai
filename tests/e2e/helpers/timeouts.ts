/**
 * Shared timeout constants for E2E tests.
 *
 * ## Profiling Methodology
 * Values derived from 3 local Playwright runs with `--trace on` (Dec 2024).
 * Formula: P95 actual timing × 5 = timeout value (accounts for CI variability)
 *
 * ## Local vs CI Timing
 * Local runs typically complete 2-4x faster than CI (GitHub Actions).
 * These values include a safety margin for I/O variability in cloud runners.
 *
 * ## Profiling Data Summary
 * | Category   | Local P95 | Max Observed | CI Estimate (×3) | Final Timeout |
 * |------------|-----------|--------------|------------------|---------------|
 * | LOADING    | 668ms     | 1,048ms      | 3,144ms          | 5,000ms       |
 * | HYDRATION  | 1,048ms   | 2,158ms      | 6,474ms          | 8,000ms       |
 * | ANIMATION  | 50ms      | 50ms         | 150ms            | 3,000ms       |
 *
 * ## Re-profiling Instructions
 * Before adjusting values, run: `npx playwright test --trace on`
 * Analyze traces with: `npx playwright show-trace test-results/.../trace.zip`
 */
export const E2E_TIMEOUTS = {
    /**
     * Standard loading state timeout.
     * Covers: IndexedDB initialization, component render, initial data fetch.
     *
     * Profiling: P95 = 668ms, Max = 1,048ms across 56 samples
     * Previous: 15,000ms → Reduced by 67%
     */
    LOADING: 5_000,

    /**
     * Extended timeout for quiz hydration with potential sync.
     * Covers: Large quiz loading, aggregated quiz building, sync operations.
     *
     * Profiling: Max observed = 2,158ms (quiz content "What is 2 + 2?")
     * Previous: 20,000ms → Reduced by 60%
     */
    HYDRATION: 8_000,

    /**
     * Animation completion timeout.
     * Covers: Framer Motion score counters, transition effects.
     *
     * Profiling: P95 = 50ms, Max = 50ms across 4 samples
     * Generous buffer for complex animations and slow CI runners.
     * Previous: 10,000ms → Reduced by 70%
     */
    ANIMATION: 3_000,
} as const;

export type E2ETimeoutKey = keyof typeof E2E_TIMEOUTS;

