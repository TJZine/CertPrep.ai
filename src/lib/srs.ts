import type { LeitnerBox } from "@/types/srs";

/**
 * Leitner box intervals in days.
 * - Box 1: 1 day (new/struggling items)
 * - Box 2: 3 days
 * - Box 3: 7 days (weekly)
 * - Box 4: 14 days (bi-weekly)
 * - Box 5: 30 days (monthly, mastered)
 */
export const BOX_INTERVALS: Record<LeitnerBox, number> = {
    1: 1,
    2: 3,
    3: 7,
    4: 14,
    5: 30,
};

/** Milliseconds in a day. */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Calculates the next review timestamp based on the current (already-updated) box and answer correctness.
 *
 * @param box - Current Leitner box (1-5).
 * @param wasCorrect - Whether the question was answered correctly.
 * @param now - Current timestamp (ms). Defaults to Date.now().
 * @returns Next review timestamp (ms).
 */
export function calculateNextReview(
    box: LeitnerBox,
    _wasCorrect: boolean, // kept for signature compatibility; box should already reflect the updated state
    now: number = Date.now(),
): number {
    const intervalDays = BOX_INTERVALS[box];
    return now + intervalDays * MS_PER_DAY;
}

/**
 * Determines the new Leitner box based on answer correctness.
 *
 * Rules:
 * - Correct answer: Move up one box (max 5)
 * - Incorrect answer: Move back to box 1
 *
 * @param currentBox - Current box number (1-5).
 * @param wasCorrect - Whether the question was answered correctly.
 * @returns New box number (1-5).
 */
export function promoteBox(currentBox: LeitnerBox, wasCorrect: boolean): LeitnerBox {
    if (!wasCorrect) {
        return 1;
    }

    if (currentBox >= 5) {
        return 5;
    }

    return (currentBox + 1) as LeitnerBox;
}

/**
 * Returns the number of days until the next review.
 *
 * @param nextReview - Next review timestamp (ms).
 * @param now - Current timestamp (ms). Defaults to Date.now().
 * @returns Days until review (negative if overdue).
 */
export function daysUntilReview(nextReview: number, now: number = Date.now()): number {
    return Math.ceil((nextReview - now) / MS_PER_DAY);
}

/**
 * Checks if a question is due for review.
 *
 * @param nextReview - Next review timestamp (ms).
 * @param now - Current timestamp (ms). Defaults to Date.now().
 * @returns True if the question is due (nextReview <= now).
 */
export function isDue(nextReview: number, now: number = Date.now()): boolean {
    return nextReview <= now;
}
