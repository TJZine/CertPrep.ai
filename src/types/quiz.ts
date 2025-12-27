/**
 * Difficulty levels for quiz questions.
 */
export type Difficulty = "Easy" | "Medium" | "Hard";

/**
 * Represents a single question within a quiz.
 */
export interface Question {
  /** Unique UUID for the question. */
  id: string;
  /** Topic category (e.g., "Legal", "Ethics"). */
  category: string;
  /** Estimated difficulty level. */
  difficulty?: Difficulty;
  /** The text content of the question. */
  question: string;
  /** Map of Option ID (e.g., "a", "b") -> Option Text. */
  options: Record<string, string>;
  /** SHA-256 hash of the correct answer string (for client-side validation without revealing answer). */
  correct_answer_hash?: string;
  /** Detailed explanation shown after answering. */
  explanation: string;
  /** Logic describing why distractors are incorrect (internal/authoring use). */
  distractor_logic?: string;
  /** Prompt used if this question was AI-generated. */
  ai_prompt?: string;
  /** Private notes taken by the user on this question. */
  user_notes?: string;
  /** The ID of the correct option (only available in teacher/edit mode or after grading). */
  correct_answer?: string;
}

/**
 * Main Quiz data structure.
 *
 * Represents a set of questions and metadata that can be taken by a user.
 */
export interface Quiz {
  /** Unique UUID for the quiz. */
  id: string;
  /** UUID of the creator/owner. */
  user_id: string;
  /** Display title of the quiz. */
  title: string;
  /** Short description or summary. */
  description: string;
  /** Creation timestamp (ms). */
  created_at: number;
  /** Last modification timestamp (ms). */
  updated_at?: number;
  /** List of questions contained in this quiz. */
  questions: Question[];
  /** Taxonomy tags for search and filtering. */
  tags: string[];
  /**
   * Schema version number (for migration compatibility).
   * Increments on structural changes.
   */
  version: number;
  /**
   * UUID of the original source quiz if this is a derived copy
   * (e.g., imported from the public library).
   */
  sourceId?: string;
  /** Timestamp if soft-deleted. Non-null implies the quiz is in the trash. */
  deleted_at?: number | null;
  /**
   * Content hash to detect changes between local and remote versions.
   * derived from title, questions, and descriptions.
   */
  quiz_hash?: string | null;
  /** Timestamp of the last successful sync with the server. */
  last_synced_at?: number | null;
  /** The version number of the quiz at the last sync. */
  last_synced_version?: number | null;
  /** Parent category for analytics grouping (e.g., "Insurance", "Firearms"). */
  category?: string;
  /** Subcategory for analytics grouping (e.g., "Massachusetts Personal Lines"). */
  subcategory?: string;
}

export const QUIZ_MODES = ["zen", "proctor", "flashcard"] as const;
export type QuizMode = (typeof QUIZ_MODES)[number];

export interface QuizSessionState {
  quizId: string;
  mode: QuizMode;
  currentQuestionIndex: number;
  answers: Record<string, string>;
  flaggedQuestions: Set<string>;
  startTime: number;
  endTime?: number;
  isComplete: boolean;
  isSubmitting?: boolean;
}
