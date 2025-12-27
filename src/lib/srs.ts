import type { LeitnerBox } from "@/types/srs";

/**
 * Flashcard rating values for SRS.
 * - 1 (Again): Reset to box 1 - card needs more work
 * - 2 (Hard): Stay in current box - card was difficult but remembered
 * - 3 (Good): Promote to next box - card was recalled successfully
 */
export type FlashcardSRSRating = 1 | 2 | 3;

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
 * Calculates the next review timestamp based on the current (already-updated) box.
 *
 * @param box - Current Leitner box (1-5).
 * @param now - Current timestamp (ms). Defaults to Date.now().
 * @returns Next review timestamp (ms).
 */
export function calculateNextReview(
    box: LeitnerBox,
    now: number = Date.now(),
): number {
    const intervalDays = BOX_INTERVALS[box];
    return now + intervalDays * MS_PER_DAY;
}

/**
 * Determines the new Leitner box based on flashcard rating.
 *
 * Rules:
 * - Rating 1 (Again): Move back to box 1
 * - Rating 2 (Hard): Stay in current box
 * - Rating 3 (Good): Move up one box (max 5)
 *
 * @param currentBox - Current box number (1-5).
 * @param rating - Flashcard rating (1=Again, 2=Hard, 3=Good).
 * @returns New box number (1-5).
 */
export function promoteBox(currentBox: LeitnerBox, rating: FlashcardSRSRating): LeitnerBox {
    if (rating === 1) {
        // Again: reset to box 1
        return 1;
    }

    if (rating === 2) {
        // Hard: stay in current box
        return currentBox;
    }

    // Good: promote (max box 5)
    if (currentBox >= 5) {
        return 5;
    }

    return (currentBox + 1) as LeitnerBox;
}

/**
 * Converts a boolean correctness value to a FlashcardSRSRating.
 * Used for backward compatibility when only correct/incorrect is known.
 *
 * - true (correct) → 3 (Good) - promotes the card
 * - false (incorrect) → 1 (Again) - resets to box 1
 *
 * Note: This does not support "Hard" (stay in box) - use explicit rating for that.
 */
export function booleanToRating(isCorrect: boolean): FlashcardSRSRating {
    return isCorrect ? 3 : 1;
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
