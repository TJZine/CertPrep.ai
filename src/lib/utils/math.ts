/**
 * Calculates the percentage of correct answers.
 *
 * @param correct - Number of correct answers.
 * @param total - Total number of questions.
 * @returns The percentage rounded to the nearest integer.
 *          Returns 0 if `total` is 0 to avoid NaN.
 *
 * @example
 * calculatePercentage(5, 10) // 50
 * calculatePercentage(0, 0)  // 0
 */
export function calculatePercentage(correct: number, total: number): number {
  if (total === 0) {
    return 0;
  }
  return Math.round((correct / total) * 100);
}
