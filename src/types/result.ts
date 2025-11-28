import type { QuizMode } from './quiz';

export interface Result {
  id: string;
  quiz_id: string;
  timestamp: number;
  mode: QuizMode;
  score: number;
  time_taken_seconds: number;
  answers: Record<string, string>;
  flagged_questions: string[];
  category_breakdown: Record<string, number>;
  synced?: number; // 0 = not synced, 1 = synced
}

export interface CategoryPerformance {
  category: string;
  correct: number;
  total: number;
  percentage: number;
}
