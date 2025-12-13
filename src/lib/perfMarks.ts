/**
 * Safely wraps performance.mark to prevent errors in environments where it's unavailable.
 */
export function safeMark(name: string): void {
  if (
    typeof performance !== "undefined" &&
    typeof performance.mark === "function"
  ) {
    performance.mark(name);
  }
}

/**
 * Safely wraps performance.measure to prevent errors.
 */
export function safeMeasure(
  name: string,
  startMark: string,
  endMark: string,
): void {
  if (
    typeof performance !== "undefined" &&
    typeof performance.measure === "function"
  ) {
    try {
      performance.measure(name, startMark, endMark);
    } catch {
      // Ignore errors (e.g., missing marks)
    }
  }
}
