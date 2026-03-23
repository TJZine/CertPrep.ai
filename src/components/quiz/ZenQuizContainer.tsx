"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { QuizLayout } from "./QuizLayout";
import { QuestionDisplay } from "./QuestionDisplay";
import { OptionsList } from "./OptionsList";
import { ExplanationPanel } from "./ExplanationPanel";
import { AITutorButton } from "./AITutorButton";
import { SubmitButton, ZenControls } from "./ZenControls";
import { Card, CardContent } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { useQuizSessionStore } from "@/stores/quizSessionStore";
import { useBeforeUnload } from "@/hooks/useBeforeUnload";

import type { Quiz } from "@/types/quiz";
import { useQuizPersistence } from "./hooks/useQuizPersistence";
import { useQuizSession } from "./hooks/useQuizSession";

interface ZenQuizContainerProps {
  quiz: Quiz;
  isSmartRound?: boolean;
  /** When true, SRS state is updated after each answer (promotes/demotes Leitner box). */
  isSRSReview?: boolean;
  /** When true, this is a Topic Study session (aggregates questions across quizzes). */
  isTopicStudy?: boolean;
  /** When true, this is an Interleaved Practice session. */
  isInterleaved?: boolean;
  /** Maps questionId → sourceQuizId for interleaved sessions. */
  interleavedSourceMap?: Map<string, string> | null;
  /** Key mappings for answer translation in remixed interleaved sessions. */
  interleavedKeyMappings?: Map<string, Record<string, string>> | null;
}

/**
 * Main orchestrator for Zen mode interactions.
 */
export function ZenQuizContainer({
  quiz,
  isSmartRound = false,
  isSRSReview = false,
  isTopicStudy = false,
  isInterleaved = false,
  interleavedSourceMap = null,
  interleavedKeyMappings = null,
}: ZenQuizContainerProps): React.ReactElement {
  const router = useRouter();
  const { addToast } = useToast();
  const {
    clearError,
    error,
    questions,
    answers,
    flaggedQuestions,
  } = useQuizSessionStore();

  const isMountedRef = React.useRef(false);
  const hasSavedResultRef = React.useRef(false);
  const completionTimeRef = React.useRef<number | null>(null);

  const {
    saveError,
    submitQuiz: handleSessionComplete,
    retrySave: retrySaveAction,
    clearSessionStorage,
    effectiveUserId,
  } = useQuizPersistence({
    quizId: quiz.id,
    isSmartRound,
    isSRSReview,
    isTopicStudy,
    isInterleaved,
    interleavedSourceMap,
    interleavedKeyMappings,
    questions,
    answers,
    flaggedQuestions,
  });

  const {
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
    selectAnswer,
    submitAnswer,
    toggleExplanation,
    toggleFlag,
    markAgain,
    markHard,
    markGood,
    resetSession,
  } = useQuizSession({
    quiz,
    isSRSReview,
    effectiveUserId,
  });

  useBeforeUnload(
    !isComplete || Boolean(saveError),
    "Your quiz progress will be lost. Are you sure?",
  );

  React.useEffect(() => {
    if (error) {
      addToast("error", error);
      clearError();
    }
  }, [error, addToast, clearError]);

  React.useEffect((): (() => void) => {
    isMountedRef.current = true;
    return (): void => {
      isMountedRef.current = false;
    };
  }, []);

  const retrySave = React.useCallback((): void => {
    const elapsedSeconds = completionTimeRef.current;
    if (elapsedSeconds === null) return;
    retrySaveAction(elapsedSeconds);
  }, [retrySaveAction]);

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

  const handleExit = React.useCallback((): void => {
    resetSession();
    clearSessionStorage();
    if (isSRSReview) {
      router.push("/study-due");
      return;
    }
    if (isTopicStudy) {
      router.push("/analytics");
      return;
    }
    if (isInterleaved) {
      router.push("/interleaved");
      return;
    }
    router.push("/");
  }, [resetSession, clearSessionStorage, isSRSReview, isTopicStudy, isInterleaved, router]);

  React.useEffect(() => {
    if (hasSubmitted && isCurrentAnswerCorrect) {
      addToast("success", "Correct! 🎉");
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
                  <SubmitButton
                    onClick={submitAnswer}
                    disabled={!selectedAnswer}
                  />
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
                      <AITutorButton
                        question={currentQuestion}
                        userAnswer={selectedAnswer}
                      />
                    )}

                    <ZenControls
                      onAgain={markAgain}
                      onHard={markHard}
                      onGood={markGood}
                      isLastQuestion={isLastQuestion}
                    />
                    {saveError ? (
                      <div className="rounded-lg border border-warning/50 bg-warning/10 p-4 text-sm text-warning">
                        <p className="mb-3 font-semibold">
                          We couldn&apos;t save your results.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" onClick={retrySave}>
                            Retry save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleExit}
                          >
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

  if (isInitializing || !currentQuestion) {
    return (
      <QuizLayout
        title={quiz.title}
        currentProgress={progress.current}
        totalQuestions={progress.total}
        onExit={handleExit}
        mode="zen"
      >
        <div className="py-12 text-center" aria-busy="true" aria-live="polite">
          <p className="text-muted-foreground">Initializing quiz session...</p>
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
