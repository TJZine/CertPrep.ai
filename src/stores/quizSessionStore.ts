'use client';

import * as React from 'react';
import { enableMapSet } from 'immer';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { SPACED_REPETITION, TIMER } from '@/lib/constants';
import type { Question, QuizMode } from '@/types/quiz';

enableMapSet();

// Spaced repetition queue item
interface QueuedQuestion {
  questionId: string;
  reappearAt: number;
}

// Answer record for a single question
interface AnswerRecord {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  timestamp: number;
  difficulty: 'again' | 'hard' | 'good' | null;
}

// Main session state
interface QuizSessionState {
  quizId: string | null;
  mode: QuizMode | null;
  questions: Question[];
  currentIndex: number;
  answeredQuestions: Set<string>;
  answers: Map<string, AnswerRecord>;
  selectedAnswer: string | null;
  hasSubmitted: boolean;
  showExplanation: boolean;
  questionQueue: string[];
  reappearQueue: QueuedQuestion[];
  hardQuestions: Set<string>;
  flaggedQuestions: Set<string>;
  startTime: number | null;
  endTime: number | null;
  isComplete: boolean;
  isPaused: boolean;
  // Proctor-specific
  seenQuestions: Set<string>;
  examDurationMinutes: number;
  timeRemaining: number;
  isTimeWarning: boolean;
  isAutoSubmitted: boolean;
}

interface QuizSessionActions {
  initializeSession: (quizId: string, mode: QuizMode, questions: Question[]) => void;
  initializeProctorSession: (quizId: string, questions: Question[], durationMinutes: number) => void;
  resetSession: () => void;
  completeSession: () => void;
  goToQuestion: (index: number) => void;
  goToNextQuestion: () => void;
  goToPreviousQuestion: () => void;
  navigateToQuestion: (index: number) => void;
  selectAnswer: (answerId: string) => void;
  submitAnswer: () => void;
  selectAnswerProctor: (answerId: string) => void;
  markAgain: () => void;
  markHard: () => void;
  markGood: () => void;
  markQuestionSeen: (questionId: string) => void;
  updateTimeRemaining: (seconds: number) => void;
  setTimeWarning: (isWarning: boolean) => void;
  submitExam: () => void;
  autoSubmitExam: () => void;
  toggleExplanation: () => void;
  toggleFlag: (questionId: string) => void;
  getCurrentQuestion: () => Question | null;
  getProgress: () => { current: number; total: number; percentage: number };
  getAnswerForQuestion: (questionId: string) => AnswerRecord | undefined;
  isQuestionAnswered: (questionId: string) => boolean;
  isQuestionFlagged: (questionId: string) => boolean;
  getSessionDuration: () => number;
  getQuestionStatus: (questionId: string) => 'unseen' | 'answered' | 'flagged' | 'seen';
  getUnansweredCount: () => number;
  getFlaggedCount: () => number;
  getAnsweredCount: () => number;
  canSubmitExam: () => boolean;
}

type QuizSessionStore = QuizSessionState & QuizSessionActions;

const createInitialState = (): QuizSessionState => ({
  quizId: null,
  mode: null,
  questions: [],
  currentIndex: 0,
  answeredQuestions: new Set<string>(),
  answers: new Map<string, AnswerRecord>(),
  selectedAnswer: null,
  hasSubmitted: false,
  showExplanation: false,
  questionQueue: [],
  reappearQueue: [],
  hardQuestions: new Set<string>(),
  flaggedQuestions: new Set<string>(),
  startTime: null,
  endTime: null,
  isComplete: false,
  isPaused: false,
  seenQuestions: new Set<string>(),
  examDurationMinutes: TIMER.DEFAULT_EXAM_DURATION_MINUTES,
  timeRemaining: TIMER.DEFAULT_EXAM_DURATION_MINUTES * 60,
  isTimeWarning: false,
  isAutoSubmitted: false,
});

export const useQuizSessionStore = create<QuizSessionStore>()(
  immer((set, get) => ({
    ...createInitialState(),

    initializeSession: (quizId, mode, questions): void => {
      set((state) => {
        Object.assign(state, createInitialState());
        state.quizId = quizId;
        state.mode = mode;
        state.questions = questions;
        state.questionQueue = questions.map((question) => question.id);
        state.currentIndex = 0;
        state.startTime = Date.now();
      });
    },

    initializeProctorSession: (quizId, questions, durationMinutes): void => {
      set((state) => {
        Object.assign(state, createInitialState());
        state.quizId = quizId;
        state.mode = 'proctor';
        state.questions = questions;
        state.questionQueue = questions.map((question) => question.id);
        state.currentIndex = 0;
        state.examDurationMinutes = durationMinutes;
        state.timeRemaining = durationMinutes * 60;
        state.startTime = Date.now();
        state.isAutoSubmitted = false;
        if (questions[0]) {
          state.seenQuestions.add(questions[0].id);
        }
      });
    },

    resetSession: (): void => {
      set(createInitialState());
    },

    completeSession: (): void => {
      set((state) => {
        if (state.isComplete) {
          return;
        }
        state.isComplete = true;
        state.endTime = Date.now();
      });
    },

    goToQuestion: (index): void => {
      set((state) => {
        if (state.mode === 'proctor') {
          if (index < 0 || index >= state.questionQueue.length || state.isComplete) {
            return;
          }
          state.currentIndex = index;
          const questionId = state.questionQueue[index];
          if (questionId) {
            state.seenQuestions.add(questionId);
            const existing = state.answers.get(questionId);
            state.selectedAnswer = existing?.selectedAnswer ?? null;
          } else {
            state.selectedAnswer = null;
          }
          state.hasSubmitted = false;
          state.showExplanation = false;
          return;
        }

        if (index < 0 || index >= state.questionQueue.length) {
          return;
        }
        state.currentIndex = index;
        state.selectedAnswer = null;
        state.hasSubmitted = false;
        state.showExplanation = false;
      });
    },

    goToNextQuestion: (): void => {
      const snapshot = get();
      if (snapshot.isComplete || snapshot.questionQueue.length === 0) {
        return;
      }

      if (snapshot.mode === 'proctor') {
        const nextIndex = Math.min(snapshot.currentIndex + 1, snapshot.questionQueue.length - 1);
        if (nextIndex !== snapshot.currentIndex) {
          snapshot.navigateToQuestion(nextIndex);
        }
        return;
      }

      set((state) => {
        const nextIndex = state.currentIndex + 1;
        const dueQuestions = state.reappearQueue.filter((item) => item.reappearAt <= nextIndex);
        if (dueQuestions.length > 0) {
          const remaining = state.reappearQueue.filter((item) => item.reappearAt > nextIndex);
          const insertAt = Math.min(nextIndex, state.questionQueue.length);
          const questionIds = dueQuestions.map((item) => item.questionId);
          state.questionQueue.splice(insertAt, 0, ...questionIds);
          state.reappearQueue = remaining;
        }

        if (nextIndex >= state.questionQueue.length) {
          state.isComplete = true;
          state.endTime = Date.now();
          state.selectedAnswer = null;
          state.hasSubmitted = false;
          state.showExplanation = false;
          return;
        }

        state.currentIndex = nextIndex;
        state.selectedAnswer = null;
        state.hasSubmitted = false;
        state.showExplanation = false;
      });
    },

    goToPreviousQuestion: (): void => {
      const snapshot = get();
      if (snapshot.isComplete || snapshot.questionQueue.length === 0) {
        return;
      }

      if (snapshot.mode === 'proctor') {
        const prevIndex = Math.max(snapshot.currentIndex - 1, 0);
        if (prevIndex !== snapshot.currentIndex) {
          snapshot.navigateToQuestion(prevIndex);
        }
        return;
      }

      set((state) => {
        if (state.currentIndex === 0) {
          return;
        }
        state.currentIndex -= 1;
        state.selectedAnswer = null;
        state.hasSubmitted = false;
        state.showExplanation = false;
      });
    },

    navigateToQuestion: (index): void => {
      set((state) => {
        if (index < 0 || index >= state.questionQueue.length || state.isComplete) {
          return;
        }
        state.currentIndex = index;
        const questionId = state.questionQueue[index];
        if (questionId) {
          state.seenQuestions.add(questionId);
          const existing = state.answers.get(questionId);
          state.selectedAnswer = existing?.selectedAnswer ?? null;
        } else {
          state.selectedAnswer = null;
        }
        state.hasSubmitted = false;
        state.showExplanation = false;
      });
    },

    selectAnswer: (answerId): void => {
      set((state) => {
        if (state.isComplete) {
          return;
        }
        state.selectedAnswer = answerId;
      });
    },

    submitAnswer: (): void => {
      set((state) => {
        if (state.isComplete) {
          return;
        }

        const questionId = state.questionQueue[state.currentIndex];
        if (!questionId || !state.selectedAnswer) {
          return;
        }

        const question = state.questions.find((q) => q.id === questionId);
        if (!question) {
          return;
        }

        const isCorrect = state.selectedAnswer === question.correct_answer;
        const previousDifficulty = state.answers.get(questionId)?.difficulty ?? null;
        const record: AnswerRecord = {
          questionId,
          selectedAnswer: state.selectedAnswer,
          isCorrect,
          timestamp: Date.now(),
          difficulty: previousDifficulty,
        };

        state.answers.set(questionId, record);
        state.answeredQuestions.add(questionId);
        state.hasSubmitted = true;
        state.showExplanation = !isCorrect;
      });
    },

    selectAnswerProctor: (answerId): void => {
      set((state) => {
        if (state.isComplete || state.mode !== 'proctor') {
          return;
        }
        const questionId = state.questionQueue[state.currentIndex];
        if (!questionId) {
          return;
        }
        const question = state.questions.find((q) => q.id === questionId);
        if (!question) {
          return;
        }
        state.selectedAnswer = answerId;
        const isCorrect = answerId === question.correct_answer;
        state.answers.set(questionId, {
          questionId,
          selectedAnswer: answerId,
          isCorrect,
          timestamp: Date.now(),
          difficulty: null,
        });
        state.answeredQuestions.add(questionId);
        state.seenQuestions.add(questionId);
      });
    },

    markAgain: (): void => {
      const state = get();
      const questionId = state.questionQueue[state.currentIndex];
      if (!questionId || !state.hasSubmitted || state.isComplete) {
        return;
      }

      set((draft) => {
        const reappearAt = draft.currentIndex + SPACED_REPETITION.AGAIN_REAPPEAR_TURNS;
        draft.reappearQueue.push({ questionId, reappearAt });

        const existing = draft.answers.get(questionId);
        if (existing) {
          existing.difficulty = 'again';
          draft.answers.set(questionId, existing);
        }
      });

      get().goToNextQuestion();
    },

    markHard: (): void => {
      const state = get();
      const questionId = state.questionQueue[state.currentIndex];
      if (!questionId || !state.hasSubmitted || state.isComplete) {
        return;
      }

      set((draft) => {
        draft.hardQuestions.add(questionId);
        const existing = draft.answers.get(questionId);
        if (existing) {
          existing.difficulty = 'hard';
          draft.answers.set(questionId, existing);
        }
      });

      get().goToNextQuestion();
    },

    markGood: (): void => {
      const state = get();
      const questionId = state.questionQueue[state.currentIndex];
      if (!questionId || !state.hasSubmitted || state.isComplete) {
        return;
      }

      set((draft) => {
        const existing = draft.answers.get(questionId);
        if (existing) {
          existing.difficulty = 'good';
          draft.answers.set(questionId, existing);
        }
      });

      get().goToNextQuestion();
    },

    markQuestionSeen: (questionId): void => {
      set((state) => {
        state.seenQuestions.add(questionId);
      });
    },

    updateTimeRemaining: (seconds): void => {
      set((state) => {
        state.timeRemaining = seconds;
        state.isTimeWarning = seconds <= TIMER.WARNING_THRESHOLD_SECONDS;
      });
    },

    setTimeWarning: (isWarning): void => {
      set((state) => {
        state.isTimeWarning = isWarning;
      });
    },

    submitExam: (): void => {
      set((state) => {
        if (state.isComplete) {
          return;
        }
        state.isComplete = true;
        state.endTime = Date.now();
        state.isAutoSubmitted = false;
      });
    },

    autoSubmitExam: (): void => {
      set((state) => {
        if (state.isComplete) {
          return;
        }
        state.isComplete = true;
        state.endTime = Date.now();
        state.isAutoSubmitted = true;
      });
    },

    toggleExplanation: (): void => {
      set((state) => {
        state.showExplanation = !state.showExplanation;
      });
    },

    toggleFlag: (questionId): void => {
      set((state) => {
        if (state.flaggedQuestions.has(questionId)) {
          state.flaggedQuestions.delete(questionId);
        } else {
          state.flaggedQuestions.add(questionId);
        }
      });
    },

    getCurrentQuestion: (): Question | null => {
      const { questions, questionQueue, currentIndex } = get();
      const questionId = questionQueue[currentIndex];
      return questions.find((question) => question.id === questionId) ?? null;
    },

    getProgress: (): { current: number; total: number; percentage: number } => {
      const { questionQueue, currentIndex, hasSubmitted, isComplete, mode, answeredQuestions, questions } = get();
      if (mode === 'proctor') {
        const total = questions.length;
        const answered = answeredQuestions.size;
        return {
          current: answered,
          total,
          percentage: total > 0 ? Math.round((answered / total) * 100) : 0,
        };
      }

      const total = questionQueue.length;
      if (total === 0) {
        return { current: 0, total: 0, percentage: 0 };
      }

      const answeredCount = isComplete ? total : Math.min(currentIndex + (hasSubmitted ? 1 : 0), total);

      return {
        current: answeredCount,
        total,
        percentage: Math.round((answeredCount / total) * 100),
      };
    },

    getAnswerForQuestion: (questionId): AnswerRecord | undefined => get().answers.get(questionId),

    isQuestionAnswered: (questionId): boolean => get().answeredQuestions.has(questionId),

    isQuestionFlagged: (questionId): boolean => get().flaggedQuestions.has(questionId),

    getSessionDuration: (): number => {
      const { startTime, endTime } = get();
      if (!startTime) {
        return 0;
      }
      const end = endTime ?? Date.now();
      return Math.floor((end - startTime) / 1000);
    },

    getQuestionStatus: (questionId): 'unseen' | 'answered' | 'flagged' | 'seen' => {
      const { flaggedQuestions, answeredQuestions, seenQuestions } = get();
      if (flaggedQuestions.has(questionId)) return 'flagged';
      if (answeredQuestions.has(questionId)) return 'answered';
      if (seenQuestions.has(questionId)) return 'seen';
      return 'unseen';
    },

    getUnansweredCount: (): number => {
      const { questions, answeredQuestions } = get();
      const unanswered = questions.length - answeredQuestions.size;
      return unanswered < 0 ? 0 : unanswered;
    },

    getFlaggedCount: (): number => get().flaggedQuestions.size,

    getAnsweredCount: (): number => get().answeredQuestions.size,

    canSubmitExam: (): boolean => {
      const { questions, isComplete } = get();
      return questions.length > 0 && !isComplete;
    },
  })),
);

// Selector hooks for performance
export const useCurrentQuestion = (): Question | null =>
  useQuizSessionStore((state) => state.getCurrentQuestion());

export const useProgress = (): { current: number; total: number; percentage: number } => {
  const currentIndex = useQuizSessionStore((state) => state.currentIndex);
  const hasSubmitted = useQuizSessionStore((state) => state.hasSubmitted);
  const isComplete = useQuizSessionStore((state) => state.isComplete);
  const total = useQuizSessionStore((state) => state.questions.length);

  return React.useMemo(() => {
    const answeredCount = isComplete ? total : Math.min(currentIndex + (hasSubmitted ? 1 : 0), total);
    const percentage = total > 0 ? Math.round((answeredCount / total) * 100) : 0;
    return { current: answeredCount, total, percentage };
  }, [currentIndex, hasSubmitted, isComplete, total]);
};

export const useIsAnswered = (): boolean => useQuizSessionStore((state) => state.hasSubmitted);

export const useProctorStatus = (): {
  timeRemaining: number;
  isTimeWarning: boolean;
  answeredCount: number;
  flaggedCount: number;
  unansweredCount: number;
  totalQuestions: number;
} => {
  const timeRemaining = useQuizSessionStore((state) => state.timeRemaining);
  const isTimeWarning = useQuizSessionStore((state) => state.isTimeWarning);
  const answeredCount = useQuizSessionStore((state) => state.getAnsweredCount());
  const flaggedCount = useQuizSessionStore((state) => state.getFlaggedCount());
  const unansweredCount = useQuizSessionStore((state) => state.getUnansweredCount());
  const totalQuestions = useQuizSessionStore((state) => state.questions.length);

  return React.useMemo(
    () => ({
      timeRemaining,
      isTimeWarning,
      answeredCount,
      flaggedCount,
      unansweredCount,
      totalQuestions,
    }),
    [timeRemaining, isTimeWarning, answeredCount, flaggedCount, unansweredCount, totalQuestions],
  );
};

export const useQuestionStatuses = (): Array<{ id: string; status: 'unseen' | 'answered' | 'flagged' | 'seen' }> =>
  {
    const questions = useQuizSessionStore((state) => state.questions);
    const answeredQuestions = useQuizSessionStore((state) => state.answeredQuestions);
    const flaggedQuestions = useQuizSessionStore((state) => state.flaggedQuestions);
    const seenQuestions = useQuizSessionStore((state) => state.seenQuestions);

    return React.useMemo(
      () =>
        questions.map((q) => {
          if (flaggedQuestions.has(q.id)) return { id: q.id, status: 'flagged' as const };
          if (answeredQuestions.has(q.id)) return { id: q.id, status: 'answered' as const };
          if (seenQuestions.has(q.id)) return { id: q.id, status: 'seen' as const };
          return { id: q.id, status: 'unseen' as const };
        }),
      [questions, answeredQuestions, flaggedQuestions, seenQuestions],
    );
  };
