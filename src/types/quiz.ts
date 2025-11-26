export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface Question {
  id: string;
  category: string;
  difficulty?: Difficulty;
  question: string;
  options: Record<string, string>;
  correct_answer: string;
  explanation: string;
  distractor_logic?: string;
  ai_prompt?: string;
  user_notes?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  created_at: number;
  questions: Question[];
  tags: string[];
  version: number;
  sourceId?: string;
}

export type QuizMode = 'zen' | 'proctor';

export interface QuizSessionState {
  quizId: string;
  mode: QuizMode;
  currentQuestionIndex: number;
  answers: Record<string, string>;
  flaggedQuestions: Set<string>;
  startTime: number;
  endTime?: number;
  isComplete: boolean;
}
