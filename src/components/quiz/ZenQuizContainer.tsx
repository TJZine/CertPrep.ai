'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { QuizLayout } from './QuizLayout';
import { QuestionDisplay } from './QuestionDisplay';
import { OptionsList } from './OptionsList';
import { ExplanationPanel } from './ExplanationPanel';
import { AITutorButton } from './AITutorButton';
import { SubmitButton, ZenControls } from './ZenControls';
import { Card, CardContent } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import {
  useCurrentQuestion,
  useProgress,
  useQuizSessionStore,
} from '@/stores/quizSessionStore';
import { useKeyboardNav, useSpacedRepetitionNav } from '@/hooks/useKeyboardNav';
import { useTimer } from '@/hooks/useTimer';
import { useBeforeUnload } from '@/hooks/useBeforeUnload';

import type { Quiz } from '@/types/quiz';
import { useCorrectAnswer } from '@/hooks/useCorrectAnswer';
import { useQuizSubmission } from '@/hooks/useQuizSubmission';

interface ZenQuizContainerProps {
  quiz: Quiz;
  isSmartRound?: boolean;
}

const SMART_ROUND_STATE_KEYS = [
  'smartRoundQuestions',
  'smartRoundQuizId',
  'smartRoundAllQuestions',
  'smartRoundMissedCount',
  'smartRoundFlaggedCount',
] as const;

export const clearSmartRoundState = (): void => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  SMART_ROUND_STATE_KEYS.forEach((key) => {
    window.sessionStorage.removeItem(key);
  });
};

/**
 * Main orchestrator for Zen mode interactions.
 */
export function ZenQuizContainer({ quiz, isSmartRound = false }: ZenQuizContainerProps): React.ReactElement {
  const router = useRouter();
  const { addToast } = useToast();
  const { saveError, submitQuiz, retrySave: retrySaveAction } = useQuizSubmission({
    quizId: quiz.id,
    isSmartRound,
  });

  const isMountedRef = React.useRef(false);
  const hasSavedResultRef = React.useRef(false);
  const completionTimeRef = React.useRef<number | null>(null);

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
    isComplete,
    error,
    clearError,
  } = useQuizSessionStore();

  const currentQuestion = useCurrentQuestion();
  const progress = useProgress();

  const { formattedTime, start: startTimer, seconds, pause: pauseTimer } = useTimer({ autoStart: true });
  useBeforeUnload(!isComplete || Boolean(saveError), 'Your quiz progress will be lost. Are you sure?');

  React.useEffect(() => {
    if (error) {
      addToast('error', error);
      clearError();
    }
  }, [error, addToast, clearError]);

  React.useEffect((): (() => void) => {
    isMountedRef.current = true;
    return (): void => {
      isMountedRef.current = false;
    };
  }, []);

  const handleSessionComplete = React.useCallback(
    async (timeTakenSeconds: number): Promise<void> => {
      await submitQuiz(timeTakenSeconds);
    },
    [submitQuiz]
  );

  const retrySave = React.useCallback((): void => {
    const elapsedSeconds = completionTimeRef.current;
    if (elapsedSeconds === null) {
      return;
    }
    // Don't set hasSavedResultRef.current = true here; 
    // let the hook manage success or set it in a callback if needed.
    retrySaveAction(elapsedSeconds);
  }, [retrySaveAction]);

  React.useEffect(() => {
    hasSavedResultRef.current = false;
    initializeSession(quiz.id, 'zen', quiz.questions);
    startTimer();
    return (): void => {
      resetSession();
      hasSavedResultRef.current = false;
    };
  }, [quiz.id, quiz.questions, initializeSession, startTimer, resetSession]);

  React.useEffect(() => {
    if (isComplete && !hasSavedResultRef.current) {
      hasSavedResultRef.current = true;
      pauseTimer();
      const elapsedSeconds = seconds;
      completionTimeRef.current = elapsedSeconds;
      void handleSessionComplete(elapsedSeconds).catch(() => {
        hasSavedResultRef.current = false;
      });
    }
  }, [isComplete, handleSessionComplete, pauseTimer, seconds]);

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

  const handleExit = React.useCallback((): void => {
    resetSession();
    if (isSmartRound) {
      clearSmartRoundState();
    }
    router.push('/');
  }, [resetSession, isSmartRound, router]);

  const isCurrentAnswerCorrect = React.useMemo(() => {
    if (!currentQuestion || !hasSubmitted) return false;
    const answerRecord = answers.get(currentQuestion.id);
    return answerRecord?.isCorrect ?? false;
  }, [currentQuestion, hasSubmitted, answers]);

  const { resolvedAnswers, isResolving } = useCorrectAnswer(
    currentQuestion?.id ?? null,
    currentQuestion?.correct_answer_hash ?? null,
    currentQuestion?.options
  );

  const currentCorrectAnswer = currentQuestion
    ? (resolvedAnswers[currentQuestion.id] || currentQuestion.correct_answer)
    : undefined;

  const isLastQuestion = currentIndex >= questionQueue.length - 1;

  React.useEffect(() => {
    if (hasSubmitted && isCurrentAnswerCorrect) {
      addToast('success', 'Correct! 🎉');
    }
  }, [hasSubmitted, isCurrentAnswerCorrect, addToast]);

  const quizContent = (
    <div className="mx-auto max-w-3xl">
      <Card>
        <CardContent className="p-6 sm:p-8">
          {currentQuestion && (
            <>
              <QuestionDisplay
                question={currentQuestion}
                questionNumber={currentIndex + 1}
                totalQuestions={progress.total}
                isFlagged={flaggedQuestions.has(currentQuestion.id)}
                onToggleFlag={() => toggleFlag(currentQuestion.id)}
              />

              <div className="mt-6">
                <OptionsList
                  options={currentQuestion.options}
                  selectedAnswer={selectedAnswer}
                  correctAnswer={currentCorrectAnswer}
                  isResolving={isResolving}
                  hasSubmitted={hasSubmitted}
                  onSelectOption={selectAnswer}
                />
              </div>

              <div className="mt-8">
                {!hasSubmitted ? (
                  <SubmitButton onClick={submitAnswer} disabled={!selectedAnswer} />
                ) : (
                  <div className="space-y-6">
                    <ExplanationPanel
                      explanation={currentQuestion.explanation}
                      distractorLogic={currentQuestion.distractor_logic}
                      isCorrect={isCurrentAnswerCorrect}
                      isExpanded={showExplanation || !isCurrentAnswerCorrect}
                      onToggle={toggleExplanation}
                    />

                    {!isCurrentAnswerCorrect && selectedAnswer && (
                      <AITutorButton question={currentQuestion} userAnswer={selectedAnswer} />
                    )}

                    <ZenControls
                      onAgain={markAgain}
                      onHard={markHard}
                      onGood={markGood}
                      isLastQuestion={isLastQuestion}
                    />
                    {saveError ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-100">
                        <p className="mb-3 font-semibold">We couldn&apos;t save your results.</p>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" onClick={retrySave}>
                            Retry save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={handleExit}>
                            Exit without saving
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );

  if (!currentQuestion) {
    return (
      <QuizLayout
        title={quiz.title}
        currentProgress={progress.current}
        totalQuestions={progress.total}
        onExit={handleExit}
        mode="zen"
      >
        <div className="py-12 text-center">
          <p className="text-slate-500">Loading question...</p>
        </div>
      </QuizLayout>
    );
  }

  return (
    <QuizLayout
      title={quiz.title}
      currentProgress={progress.current}
      totalQuestions={progress.total}
      timerDisplay={formattedTime}
      onExit={handleExit}
      mode="zen"
    >
      {quizContent}
    </QuizLayout>
  );
}

export default ZenQuizContainer;
