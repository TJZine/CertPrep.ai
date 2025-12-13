/**
 * Returns a canonical, locale-independent date key in YYYY-MM-DD based on local time.
 * @throws Error if dateInput is invalid.
 */
export function formatDateKey(dateInput: Date | number | string): string {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date input: ${String(dateInput)}`);
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Safe version of formatDateKey that returns null on invalid input.
 * Use in UI contexts where invalid dates should fail gracefully.
 */
export function tryFormatDateKey(dateInput: Date | number | string): string | null {
  try {
    return formatDateKey(dateInput);
  } catch {
    return null;
  }
}


/**
 * Formats a date for display using local time (e.g., Sep 5).
 */
export function formatMonthDayLabel(
  dateInput: Date | number | string,
  locale = "en-US",
): string {
  return new Date(dateInput).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  });
}
