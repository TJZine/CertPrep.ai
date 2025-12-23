/**
 * Shared E2E test selectors.
 *
 * Centralizes brittle selectors that may need updating if component
 * implementations change. Using constants makes maintenance easier
 * when selectors break across multiple test files.
 */

/**
 * Loading spinner selector.
 *
 * Uses Tailwind utility classes because the spinner component lacks a data-testid.
 * The specific combination (h-8 w-8 animate-spin) is required for Playwright
 * strict mode to avoid matching multiple spinners of different sizes.
 *
 * @see src/app/interleaved/page.tsx line 166 - Loading spinner component
 */
export const SPINNER_SELECTOR = ".h-8.w-8.animate-spin";
