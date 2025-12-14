import type { SyncFlag } from "./result";

/**
 * Leitner box number (1-5).
 * - Box 1: Review daily (new/struggling items)
 * - Box 2: Review every 3 days
 * - Box 3: Review weekly
 * - Box 4: Review bi-weekly
 * - Box 5: Review monthly (mastered)
 */
export type LeitnerBox = 1 | 2 | 3 | 4 | 5;

/**
 * Spaced Repetition State for a question-user pair.
 *
 * Tracks the Leitner box position and review schedule for a specific
 * question as studied by a specific user. Used to determine which
 * questions are due for review.
 */
export interface SRSState {
    /** The question this state tracks. */
    question_id: string;
    /** The user this state belongs to. */
    user_id: string;
    /** Current Leitner box (1 = most frequent review, 5 = least). */
    box: LeitnerBox;
    /** Unix timestamp (ms) of the last review. */
    last_reviewed: number;
    /** Unix timestamp (ms) when the next review is due. */
    next_review: number;
    /** Consecutive correct answers (for box promotion logic). */
    consecutive_correct: number;
    /** Sync status (0 = local only, 1 = synced). Reserved for future use. */
    synced?: SyncFlag;
    /** Local timestamp for sync cursor tracking. */
    updated_at?: number;
}
