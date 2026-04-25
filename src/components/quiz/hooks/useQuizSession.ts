import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useQuizSessionStore, useCurrentQuestion } from "@/stores/quizSessionStore";
import { useTimer } from "@/hooks/useTimer";
import { useKeyboardNav, useSpacedRepetitionNav } from "@/hooks/useKeyboardNav";
import { useCorrectAnswer } from "@/hooks/useCorrectAnswer";
import { remixQuiz } from "@/lib/quiz/quizRemix";
import { updateSRSState } from "@/db/srs";
import { booleanToRating } from "@/lib/srs";

import type { Quiz, Question } from "@/types/quiz";

interface UseQuizSessionProps {
  quiz: Quiz;
  isSRSReview: boolean;
  effectiveUserId: string | null;
}

export function useQuizSession({
  quiz,
  isSRSReview,
  effectiveUserId,
}: UseQuizSessionProps): {
  isInitializing: boolean;
  currentQuestion: Question | null;
  currentIndex: number;
  progress: { current: number; total: number };
  selectedAnswer: string | null;
  hasSubmitted: boolean;
  showExplanation: boolean;
  isComplete: boolean;
  formattedTime: string;
  seconds: number;
  pauseTimer: () => void;
  isResolving: boolean;
  currentCorrectAnswer: string | undefined;
  isCurrentAnswerCorrect: boolean;
  isLastQuestion: boolean;
  answers: Map<string, { selectedAnswer: string; isCorrect: boolean }>;
  questions: Question[];
  flaggedQuestions: Set<string>;
  selectAnswer: (answerId: string) => void;
  submitAnswer: () => void;
  toggleExplanation: () => void;
  toggleFlag: (questionId: string) => void;
  markAgain: () => void;
  markHard: () => void;
  markGood: () => void;
  resetSession: () => void;
} {
  const searchParams = useSearchParams();
  const {
    initializeSession,
    selectAnswer,
    submitAnswer,
    toggleExplanation,
    toggleFlag,
    markAgain,
    markHard,
    markGood,
    resetSession,
    currentIndex,
    selectedAnswer,
    hasSubmitted,
    showExplanation,
    answers,
    flaggedQuestions,
    questionQueue,
    questions,
    isComplete,
  } = useQuizSessionStore();

  const currentQuestion = useCurrentQuestion();

  const {
    formattedTime,
    start: startTimer,
    seconds,
    pause: pauseTimer,
  } = useTimer({ autoStart: true });

  const [isInitializing, setIsInitializing] = React.useState(true);
  const srsUpdatedQuestionsRef = React.useRef<Set<string>>(new Set());

  // Reset SRS tracking when session context changes
  React.useEffect(() => {
    srsUpdatedQuestionsRef.current.clear();
  }, [quiz.id, effectiveUserId, isSRSReview]);

  React.useEffect(() => {
    let mounted = true;
    const init = async (): Promise<void> => {
      setIsInitializing(true);
      if (searchParams?.get("remix") === "true") {
        try {
          const { quiz: remixedQuiz, keyMappings } = await remixQuiz(quiz);
          if (!mounted) return;
          initializeSession(quiz.id, "zen", remixedQuiz.questions, keyMappings);
        } catch (err) {
          console.error("Failed to remix quiz:", err);
          if (!mounted) return;
          initializeSession(quiz.id, "zen", quiz.questions);
        }
      } else {
        initializeSession(quiz.id, "zen", quiz.questions);
      }
      if (!mounted) return;
      startTimer();
      setIsInitializing(false);
    };

    void init();

    return (): void => {
      mounted = false;
      resetSession();
    };
  }, [quiz, initializeSession, startTimer, resetSession, searchParams]);

  const totalQuestions = questionQueue.length;
  const progress = {
    current: isComplete
      ? totalQuestions
      : Math.min(currentIndex + (hasSubmitted ? 1 : 0), totalQuestions),
    total: totalQuestions,
  };

  const { resolvedAnswers, isResolving } = useCorrectAnswer(
    currentQuestion?.id ?? null,
    currentQuestion?.correct_answer_hash ?? null,
    currentQuestion?.options,
  );

  const currentCorrectAnswer = currentQuestion
    ? resolvedAnswers[currentQuestion.id] || currentQuestion.correct_answer
    : undefined;

  const isLastQuestion = currentIndex >= questionQueue.length - 1;

  const isCurrentAnswerCorrect = React.useMemo(() => {
    if (!currentQuestion || !hasSubmitted) return false;
    const answerRecord = answers.get(currentQuestion.id);
    return answerRecord?.isCorrect ?? false;
  }, [currentQuestion, hasSubmitted, answers]);

  // Update SRS state after each answer
  React.useEffect(() => {
    if (!isSRSReview || !hasSubmitted || !currentQuestion || !effectiveUserId) return;
    if (srsUpdatedQuestionsRef.current.has(currentQuestion.id)) return;
    const answerRecord = answers.get(currentQuestion.id);
    if (!answerRecord) return;
    srsUpdatedQuestionsRef.current.add(currentQuestion.id);
    void updateSRSState(
      currentQuestion.id,
      effectiveUserId,
      booleanToRating(answerRecord.isCorrect),
    ).catch((err) => {
      console.warn("Failed to update SRS state:", err);
      srsUpdatedQuestionsRef.current.delete(currentQuestion.id);
    });
  }, [isSRSReview, hasSubmitted, currentQuestion, effectiveUserId, answers]);

  useKeyboardNav({
    onSelectOption: (key) => {
      if (!hasSubmitted && currentQuestion?.options[key]) {
        selectAnswer(key);
      }
    },
    onSubmit: () => {
      if (selectedAnswer && !hasSubmitted) {
        submitAnswer();
      }
    },
    onFlag: () => {
      if (currentQuestion) {
        toggleFlag(currentQuestion.id);
      }
    },
    enabled: !isComplete,
    optionKeys: currentQuestion ? Object.keys(currentQuestion.options) : [],
  });

  useSpacedRepetitionNav({
    onAgain: markAgain,
    onHard: markHard,
    onGood: markGood,
    enabled: hasSubmitted && !isComplete,
  });

  return {
    isInitializing,
    currentQuestion,
    currentIndex,
    progress,
    selectedAnswer,
    hasSubmitted,
    showExplanation,
    isComplete,
    formattedTime,
    seconds,
    pauseTimer,
    isResolving,
    currentCorrectAnswer,
    isCurrentAnswerCorrect,
    isLastQuestion,
    answers: answers as Map<string, { selectedAnswer: string; isCorrect: boolean }>,
    questions,
    flaggedQuestions,
    selectAnswer,
    submitAnswer,
    toggleExplanation,
    toggleFlag,
    markAgain,
    markHard,
    markGood,
    resetSession,
  };
}
