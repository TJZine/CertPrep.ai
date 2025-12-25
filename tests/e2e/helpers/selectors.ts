/**
 * Shared E2E test selectors.
 *
 * Centralizes brittle selectors that may need updating if component
 * implementations change. Using constants makes maintenance easier
 * when selectors break across multiple test files.
 */

/**
 * Top-level loading spinner (uses data-testid="loading-spinner")
 *
 * This data-testid is unique to the top-level spinner component,
 * which renders with h-8 w-8 animate-spin classes for visual distinction.
 *
 * @see src/app/interleaved/page.tsx - Loading spinner component
 */
export const SPINNER_SELECTOR = "[data-testid='loading-spinner']";
