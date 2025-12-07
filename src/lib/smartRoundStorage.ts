import { logger } from "@/lib/logger";

/** Storage key for the array of question IDs in a Smart Round */
export const SMART_ROUND_QUESTIONS_KEY = "smartRoundQuestions";
/** Storage key for the quiz ID associated with the Smart Round */
export const SMART_ROUND_QUIZ_ID_KEY = "smartRoundQuizId";
/** Storage key for all question IDs (before filtering) */
export const SMART_ROUND_ALL_QUESTIONS_KEY = "smartRoundAllQuestions";
/** Storage key for count of missed questions */
export const SMART_ROUND_MISSED_COUNT_KEY = "smartRoundMissedCount";
/** Storage key for count of flagged questions */
export const SMART_ROUND_FLAGGED_COUNT_KEY = "smartRoundFlaggedCount";

export const SMART_ROUND_STATE_KEYS = [
  SMART_ROUND_QUESTIONS_KEY,
  SMART_ROUND_QUIZ_ID_KEY,
  SMART_ROUND_ALL_QUESTIONS_KEY,
  SMART_ROUND_MISSED_COUNT_KEY,
  SMART_ROUND_FLAGGED_COUNT_KEY,
] as const;

/**
 * Best-effort clear of Smart Round sessionStorage keys.
 * Swallows storage exceptions (e.g., Safari private mode) to avoid crashing flows.
 */
export function clearSmartRoundState(): void {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  try {
    SMART_ROUND_STATE_KEYS.forEach((key) => {
      window.sessionStorage.removeItem(key);
    });
  } catch (error) {
    logger.warn("Failed to clear Smart Round state from sessionStorage", error);
  }
}
