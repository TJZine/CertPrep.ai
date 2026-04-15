import { v5 as uuidv5 } from "uuid";
import type { Quiz } from "@/types/quiz";

/**
 * Legacy prefix for per-user SRS quiz IDs.
 *
 * NOTE: This legacy format (`srs-{userId}`) is NOT a valid UUID and therefore
 * cannot sync to Supabase when `quizzes.id` is a UUID column.
 */
export const LEGACY_SRS_QUIZ_ID_PREFIX = "srs-";

/**
 * Generates the deterministic SRS quiz ID for a user.
 *
 * This MUST be a valid UUID to round-trip through Supabase's `uuid` columns.
 */
export function getSRSQuizId(userId: string): string {
  return uuidv5(`certprep:srs:${userId}`, uuidv5.URL);
}

/**
 * Checks if a quiz ID is an SRS review quiz.
 */
export function isSRSQuiz(
  quizOrId: Pick<Quiz, "id" | "user_id"> | string,
  userId?: string,
): boolean {
  if (typeof quizOrId === "string") {
    if (quizOrId.startsWith(LEGACY_SRS_QUIZ_ID_PREFIX)) return true;
    return Boolean(userId && quizOrId === getSRSQuizId(userId));
  }

  if (quizOrId.id.startsWith(LEGACY_SRS_QUIZ_ID_PREFIX)) return true;
  return quizOrId.id === getSRSQuizId(quizOrId.user_id);
}
