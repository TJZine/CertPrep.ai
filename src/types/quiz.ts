export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface Question {
  id: string;
  category: string;
  difficulty?: Difficulty;
  question: string;
  options: Record<string, string>;
  correct_answer_hash?: string;
  explanation: string;
  distractor_logic?: string;
  ai_prompt?: string;
  user_notes?: string;
  correct_answer?: string;
}

export interface Quiz {
  id: string;
  user_id: string;
  title: string;
  description: string;
  created_at: number;
  updated_at?: number;
  questions: Question[];
  tags: string[];
  version: number;
  sourceId?: string;
  deleted_at?: number | null;
  quiz_hash?: string | null;
  last_synced_at?: number | null;
  last_synced_version?: number | null;
}

export const QUIZ_MODES = ['zen', 'proctor'] as const;
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
