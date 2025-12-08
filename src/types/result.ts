import type { QuizMode } from "./quiz";

export type SyncFlag = 0 | 1;

export interface Result {
  id: string;
  quiz_id: string;
  user_id: string;
  timestamp: number;
  mode: QuizMode;
  score: number;
  time_taken_seconds: number;
  answers: Record<string, string>;
  flagged_questions: string[];
  category_breakdown: Record<string, number>;
  question_ids?: string[]; // Subset of questions in this session (Smart Round, Review Missed)
  synced?: SyncFlag; // 0 = not synced, 1 = synced
  deleted_at?: number; // Timestamp if soft deleted locally (waiting for sync)
}

export interface CategoryPerformance {
  category: string;
  correct: number;
  total: number;
  percentage: number;
}
