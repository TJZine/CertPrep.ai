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
import { Modal } from "@/components/ui/Modal";
import { useQuizSessionStore } from "@/stores/quizSessionStore";
import { useBeforeUnload } from "@/hooks/useBeforeUnload";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";

import type { Quiz, ZenSessionKind } from "@/types/quiz";
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
  /** Maps questionId → sourceQuizId for aggregated sessions. */
  sessionSourceMap?: Map<string, string> | null;
  /** Key mappings for answer translation in remixed sessions. */
  sessionKeyMappings?: Map<string, Record<string, string>> | null;
  /** Explicit route/session intent. Only standard_zen is draft eligible. */
  sessionKind?: ZenSessionKind;
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
  sessionSourceMap = null,
  sessionKeyMappings = null,
  sessionKind = "standard_zen",
}: ZenQuizContainerProps): React.ReactElement {
  const router = useRouter();
  const { addToast } = useToast();
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId(user?.id);
  const { clearError, error, questions, answers, flaggedQuestions } =
    useQuizSessionStore();

  const isMountedRef = React.useRef(false);
  const hasSavedResultRef = React.useRef(false);
  const completionTimeRef = React.useRef<number | null>(null);

  const draftEligible =
    sessionKind === "standard_zen" &&
    !isSmartRound &&
    !isSRSReview &&
    !isTopicStudy &&
    !isInterleaved &&
    sessionKeyMappings === null;

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
    draftDecision,
    draftSaveStatus,
    draftSaveMessage,
    draftOwnerId,
    resumeDraft,
    startOverDraft,
    resumeDraftAsNewAttempt,
    flushDraft,
  } = useQuizSession({
    quiz,
    isSRSReview,
    effectiveUserId,
    draftEligible,
  });

  const {
    saveError,
    submitQuiz: handleSessionComplete,
    retrySave: retrySaveAction,
    clearSessionStorage,
  } = useQuizPersistence({
    config: {
      quizId: quiz.id,
      isSmartRound,
      isSRSReview,
      isTopicStudy,
      isInterleaved,
      sourceMap: sessionSourceMap,
      keyMappings: sessionKeyMappings,
    },
    questions,
    answers,
    flaggedQuestions,
    standardZenDraftOwnerId: draftEligible ? draftOwnerId : null,
  });

  useBeforeUnload(
    (!draftEligible && !isComplete) ||
      draftSaveStatus === "saving" ||
      draftSaveStatus === "error" ||
      draftSaveStatus === "conflict" ||
      Boolean(saveError),
    draftEligible
      ? "Your latest progress may still be saving on this device."
      : "Your quiz progress will be lost. Are you sure?",
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
      void (async (): Promise<void> => {
        if (draftEligible && !(await flushDraft(true))) {
          throw new Error("Draft flush failed before result creation.");
        }
        await handleSessionComplete(elapsedSeconds);
      })().catch(() => {
        hasSavedResultRef.current = false;
      });
    }
  }, [
    draftEligible,
    flushDraft,
    handleSessionComplete,
    isComplete,
    pauseTimer,
    seconds,
  ]);

  const handleExit = React.useCallback(async (): Promise<void> => {
    // A conflicted tab no longer owns the draft, so it must be allowed to
    // leave without attempting (or being able) to overwrite the newer tab.
    if (
      draftEligible &&
      draftSaveStatus !== "conflict" &&
      !(await flushDraft(true))
    ) {
      addToast(
        "error",
        "Your latest progress was not saved. Try exiting again after the save succeeds.",
      );
      return;
    }
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
  }, [
    addToast,
    clearSessionStorage,
    draftEligible,
    draftSaveStatus,
    flushDraft,
    isInterleaved,
    isSRSReview,
    isTopicStudy,
    resetSession,
    router,
  ]);

  const requestExit = React.useCallback((): void => {
    void handleExit();
  }, [handleExit]);

  React.useEffect(() => {
    if (hasSubmitted && isCurrentAnswerCorrect) {
      addToast("success", "Correct! 🎉");
    }
  }, [hasSubmitted, isCurrentAnswerCorrect, addToast]);

  const persistenceNotice = draftEligible ? (
    <div
      className={
        draftSaveStatus === "error" || draftSaveStatus === "conflict"
          ? "mb-4 rounded-lg border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-warning"
          : "mb-4 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
      }
      role={
        draftSaveStatus === "error" || draftSaveStatus === "conflict"
          ? "alert"
          : "status"
      }
      aria-live="polite"
    >
      {draftSaveStatus === "saving"
        ? "Saving on this device…"
        : (draftSaveMessage ?? "Saved on this device.")}
    </div>
  ) : null;

  const quizContent = (
    <div className="mx-auto max-w-3xl">
      {persistenceNotice}
      <Card>
        <CardContent className="p-6 sm:p-8">
          {saveError ? (
            <div className="mb-6 rounded-lg border border-warning/50 bg-warning/10 p-4 text-sm text-warning">
              <p className="mb-3 font-semibold">
                We couldn&apos;t save your results.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={retrySave}>
                  Retry save
                </Button>
                <Button size="sm" variant="ghost" onClick={requestExit}>
                  Exit without saving
                </Button>
              </div>
            </div>
          ) : null}
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
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );

  if (draftDecision) {
    const isResultConflict = draftDecision.kind === "result-conflict";
    const isIncompatible = draftDecision.kind === "incompatible";
    const title = isResultConflict
      ? "Quiz completed elsewhere"
      : isIncompatible
        ? "Saved quiz can't be resumed"
        : "Continue saved quiz?";
    const description = isResultConflict
      ? "A completed attempt was added after this device-local draft began. Choose how to continue."
      : isIncompatible
        ? (draftDecision.assessment.reason ??
          "This saved draft is not compatible with the current quiz.")
        : "Your progress is saved on this device. Resume it or start over.";
    return (
      <QuizLayout
        title={quiz.title}
        currentProgress={0}
        totalQuestions={quiz.questions.length}
        onExit={() => router.push("/")}
        showExitConfirm={false}
        mode="zen"
      >
        <div className="py-12 text-center text-sm text-muted-foreground">
          Saved on this device.
        </div>
        <Modal
          isOpen
          onClose={() => router.push("/")}
          title={title}
          description={description}
          size="sm"
          footer={
            <>
              {isIncompatible ? (
                <Button variant="outline" onClick={() => router.push("/")}>
                  Back to Dashboard
                </Button>
              ) : null}
              <Button variant="outline" onClick={() => void startOverDraft()}>
                {isResultConflict ? "Start New Attempt" : "Start Over"}
              </Button>
              {!isIncompatible ? (
                <Button
                  onClick={() =>
                    void (isResultConflict
                      ? resumeDraftAsNewAttempt()
                      : resumeDraft())
                  }
                >
                  {isResultConflict ? "Resume as New Attempt" : "Resume"}
                </Button>
              ) : null}
            </>
          }
        >
          <p className="text-sm text-muted-foreground">
            Drafts stay in this browser and are never synchronized to the cloud.
          </p>
        </Modal>
      </QuizLayout>
    );
  }

  if (isInitializing || !currentQuestion) {
    return (
      <QuizLayout
        title={quiz.title}
        currentProgress={progress.current}
        totalQuestions={progress.total}
        onExit={requestExit}
        mode="zen"
        exitDescription={
          draftEligible
            ? draftSaveStatus === "conflict"
              ? "A newer tab owns this saved draft. Exiting will not overwrite it."
              : draftSaveStatus === "error"
              ? "Your latest progress has not been saved. Close this dialog and retry after the device save succeeds."
              : "Your progress is saved on this device. You can continue this quiz later."
            : "Exiting ends this session. This mode does not save resumable progress."
        }
      >
        <div className="mx-auto max-w-3xl">
          {persistenceNotice}
          <div
            className="py-12 text-center"
            aria-busy="true"
            aria-live="polite"
          >
            <p className="text-muted-foreground">
              Initializing quiz session...
            </p>
          </div>
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
      onExit={requestExit}
      mode="zen"
      exitDescription={
        draftEligible
          ? draftSaveStatus === "conflict"
            ? "A newer tab owns this saved draft. Exiting will not overwrite it."
            : draftSaveStatus === "error"
            ? "Your latest progress has not been saved. Close this dialog and retry after the device save succeeds."
            : "Your progress is saved on this device. You can continue this quiz later."
          : "Exiting ends this session. This mode does not save resumable progress."
      }
    >
      {quizContent}
    </QuizLayout>
  );
}

export default ZenQuizContainer;
