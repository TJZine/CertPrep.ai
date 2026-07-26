export const ZEN_DRAFT_SCHEMA_VERSION = 1 as const;

export type ZenDraftDifficulty = "again" | "hard" | "good" | null;

export interface ZenDraftAnswer {
  question_id: string;
  selected_answer: string;
  is_correct: boolean;
  answered_at: number;
  difficulty: ZenDraftDifficulty;
  time_spent_seconds: number;
}

/**
 * A resumable standard-Zen session owned exclusively by this browser database.
 * This record deliberately has no `synced` or other remote-sync metadata.
 */
export interface ZenQuizDraft {
  schema_version: typeof ZEN_DRAFT_SCHEMA_VERSION;
  user_id: string;
  quiz_id: string;
  mode: "zen";
  quiz_version: number;
  quiz_hash: string;
  question_ids: string[];
  current_index: number;
  answers: ZenDraftAnswer[];
  flagged_question_ids: string[];
  hard_question_ids: string[];
  selected_answer: string | null;
  has_submitted: boolean;
  show_explanation: boolean;
  elapsed_seconds: number;
  started_at: number;
  updated_at: number;
  /** Latest remote/local completion explicitly accepted by Resume as New Attempt. */
  reconciled_result_at?: number;
  /** Per-tab ownership token. */
  writer_id: string;
  /** Monotonic compare-and-set revision used to reject older tab writes. */
  revision: number;
}

export type ZenDraftKey = [userId: string, quizId: string];

export type ZenDraftCompatibility =
  "resumable" | "result-conflict" | "quiz-changed" | "invalid";

export interface ZenDraftAssessment {
  compatibility: ZenDraftCompatibility;
  draft: ZenQuizDraft;
  latest_result_at?: number;
  reason?: string;
}
