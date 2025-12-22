import type { QuizMode } from "./quiz";

/**
 * Flag indicating synchronization status with the remote database.
 * - `0`: Local only (not yet synced).
 * - `1`: Synced with Supabase.
 */
export type SyncFlag = 0 | 1;

/**
 * Explicit session type classification.
 * Used to identify how a quiz result was generated.
 */
export type SessionType =
  | "standard"      // Normal quiz attempt
  | "smart_round"   // Subset of missed/flagged questions
  | "srs_review"    // Spaced repetition review session
  | "topic_study"   // Category-focused study session
  | "interleaved";  // Multi-quiz aggregated practice

/**
 * Represents the outcome of a completed quiz session.
 *
 * This record is immutable once created, except for the `synced` status
 * which changes after successful upload to the remote database.
 */
export interface Result {
  /** Unique UUID for this result record. */
  id: string;
  /** UUID of the quiz that was taken. */
  quiz_id: string;
  /** UUID of the user who took the quiz. */
  user_id: string;
  /** Unix timestamp (ms) when the quiz was finished. */
  timestamp: number;
  /** Mode the quiz was taken in (e.g., "zen", "proctor"). */
  mode: QuizMode;
  /** Score as a percentage (0-100). Calculated from Math.round((correct/total) * 100). */
  score: number;
  /** Total duration of the session in seconds. */
  time_taken_seconds: number;
  /** Map of Question ID -> Selected Option ID. */
  answers: Record<string, string>;
  /** ID strings of questions flagged by the user during the session. */
  flagged_questions: string[];
  /** Breakdown of performance metrics by category. */
  category_breakdown: Record<string, number>;
  /**
   * Optional list of specific question IDs included in this session.
   *
   * Used for "Smart Round" or "Review Missed" sessions where the quiz
   * is a dynamically generated subset of the original source quiz.
   */
  question_ids?: string[];
  /** Synchronization status flag (0 = pending, 1 = synced). */
  synced?: SyncFlag;
  /**
   * Timestamp (ms) indicating when this result was soft-deleted locally.
   *
   * If present, this record is pending permanent deletion on the server
   * during the next sync cycle.
   */
  deleted_at?: number;
  /**
   * Pre-computed category scores calculated at save time.
   * Used by analytics to avoid re-hashing answers on every render.
   * Maps category name → { correct, total } counts.
   */
  computed_category_scores?: Record<string, { correct: number; total: number }>;
  /**
   * Self-assessed difficulty ratings from Zen mode.
   * Maps Question ID → rating (1=again, 2=hard, 3=good).
   * Only populated for Zen mode quizzes where user rates questions.
   */
  difficulty_ratings?: Record<string, 1 | 2 | 3>;
  /**
   * Time spent on each question in seconds.
   * Maps Question ID → seconds spent before submitting answer.
   */
  time_per_question?: Record<string, number>;
  /**
   * Explicit session type classification.
   * Replaces inference from quiz ID for aggregated sessions.
   */
  session_type?: SessionType;
  /**
   * Maps question ID to source quiz ID for aggregated sessions.
   * Enables "this question came from Quiz X" in results review.
   * Only populated for: srs_review, topic_study, interleaved.
   */
  source_map?: Record<string, string>;
}

/**
 * Performance metrics for a specific question category.
 */
export interface CategoryPerformance {
  /** Name of the category. */
  category: string;
  /** Number of questions answered correctly in this category. */
  correct: number;
  /** Total number of questions answered in this category. */
  total: number;
  /** Calculated percentage (0-100). */
  percentage: number;
}
