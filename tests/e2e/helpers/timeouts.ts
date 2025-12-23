/**
 * Shared timeout constants for E2E tests.
 *
 * ## Profiling Methodology
 * Values derived from 3 local Playwright runs with `--trace on` (Dec 2024).
 * Formula: P95 actual timing × 5 = timeout value (accounts for CI variability)
 *
 * ## Auth Latency Adjustment (Dec 2025)
 * After migrating sync managers from getSession() to getUser(), added ~50-200ms
 * latency per auth call. Timeouts increased to account for this overhead.
 *
 * ## Local vs CI Timing
 * Local runs typically complete 2-4x faster than CI (GitHub Actions).
 * These values include a safety margin for I/O variability in cloud runners.
 *
 * ## Profiling Data Summary
 * | Category   | Local P95 | Max Observed | CI Estimate (×3) | Auth Overhead | Final Timeout |
 * |------------|-----------|--------------|------------------|---------------|---------------|
 * | LOADING    | 668ms     | 1,048ms      | 3,144ms          | +200ms        | 6,000ms       |
 * | HYDRATION  | 1,048ms   | 2,158ms      | 6,474ms          | +200ms        | 10,000ms      |
 * | ANIMATION  | 50ms      | 50ms         | 150ms            | —             | 3,000ms       |
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
     * Auth adjustment: +200ms for getUser() validation
     * Previous: 5,000ms → Increased by 20%
     */
    LOADING: 6_000,

    /**
     * Extended timeout for quiz hydration with potential sync.
     * Covers: Large quiz loading, aggregated quiz building, sync operations.
     *
     * Profiling: Max observed = 2,158ms (quiz content "What is 2 + 2?")
     * Auth adjustment: +200ms for getUser() validation
     * Previous: 8,000ms → Increased by 25%
     */
    HYDRATION: 10_000,

    /**
     * Animation completion timeout.
     * Covers: Framer Motion score counters, transition effects.
     *
     * Profiling: P95 = 50ms, Max = 50ms across 4 samples
     * Unchanged - animations don't depend on auth.
     */
    ANIMATION: 3_000,

    /**
     * Heavy operation timeout.
     * Covers: Full page reloads, large data processing, complex interactions under load.
     */
    SLOW: 15_000,
} as const;

export type E2ETimeoutKey = keyof typeof E2E_TIMEOUTS;
