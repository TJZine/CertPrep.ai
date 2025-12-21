"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QuizLayout } from "./QuizLayout";
import { QuestionDisplay } from "./QuestionDisplay";
import { OptionsList } from "./OptionsList";
import { ExplanationPanel } from "./ExplanationPanel";
import { AITutorButton } from "./AITutorButton";
import { SubmitButton, ZenControls } from "./ZenControls";
import { Card, CardContent } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import {
  useCurrentQuestion,
  useProgress,
  useQuizSessionStore,
} from "@/stores/quizSessionStore";
import { useKeyboardNav, useSpacedRepetitionNav } from "@/hooks/useKeyboardNav";
import { useTimer } from "@/hooks/useTimer";
import { useBeforeUnload } from "@/hooks/useBeforeUnload";

import type { Quiz } from "@/types/quiz";
import { useCorrectAnswer } from "@/hooks/useCorrectAnswer";
import { useQuizSubmission } from "@/hooks/useQuizSubmission";
import { clearSmartRoundState } from "@/lib/smartRoundStorage";
import { clearSRSReviewState } from "@/lib/srsReviewStorage";
import { clearTopicStudyState } from "@/lib/topicStudyStorage";
import { clearInterleavedState } from "@/lib/interleavedStorage";
import { updateSRSState } from "@/db/srs";
import { createSRSReviewResult, createTopicStudyResult, createInterleavedResult } from "@/db/results";
import { getOrCreateSRSQuiz } from "@/db/quizzes";
import { db } from "@/db";
import { calculatePercentage } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { useSync } from "@/hooks/useSync";
import { remixQuiz, buildAnswersRecord } from "@/lib/quiz-remix";

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
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const {
    saveError,
    submitQuiz,
    retrySave: retrySaveAction,
  } = useQuizSubmission({
    quizId: quiz.id,
    isSmartRound,
  });

  const isMountedRef = React.useRef(false);
  const hasSavedResultRef = React.useRef(false);
  const completionTimeRef = React.useRef<number | null>(null);
  // Track which question IDs have had SRS state updated to prevent duplicate updates
  const srsUpdatedQuestionsRef = React.useRef<Set<string>>(new Set());

  // Auth for SRS updates
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId(user?.id);
  const { sync } = useSync();

  // Reset SRS tracking when session context changes (user OR quiz change)
  React.useEffect(() => {
    srsUpdatedQuestionsRef.current.clear();
  }, [quiz.id, effectiveUserId, isSRSReview]);

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
    error,
    clearError,
  } = useQuizSessionStore();

  const currentQuestion = useCurrentQuestion();
  const progress = useProgress();

  const {
    formattedTime,
    start: startTimer,
    seconds,
    pause: pauseTimer,
  } = useTimer({ autoStart: true });
  useBeforeUnload(
    !isComplete || Boolean(saveError),
    "Your quiz progress will be lost. Are you sure?",
  );

  const [isInitializing, setIsInitializing] = React.useState(true);

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

  const handleSessionComplete = React.useCallback(
    async (timeTakenSeconds: number): Promise<void> => {
      // SRS review sessions save results differently
      if (isSRSReview && effectiveUserId) {
        try {
          const srsQuiz = await getOrCreateSRSQuiz(effectiveUserId);
          const questionMap = new Map(questions.map((q) => [q.id, q]));
          let correctCount = 0;
          const categoryTotals: Record<string, { correct: number; total: number }> = {};
          const answersRecord: Record<string, string> = {};
          const actualQuestionIds: string[] = [];

          answers.forEach((record, questionId) => {
            answersRecord[questionId] = record.selectedAnswer;
            const question = questionMap.get(questionId);
            if (!question) return;

            actualQuestionIds.push(questionId);
            const category = question.category || "Uncategorized";
            if (!categoryTotals[category]) {
              categoryTotals[category] = { correct: 0, total: 0 };
            }
            categoryTotals[category].total += 1;

            if (record.isCorrect) {
              correctCount += 1;
              categoryTotals[category].correct += 1;
            }
          });

          const score = calculatePercentage(correctCount, answers.size);
          const categoryBreakdown = Object.fromEntries(
            Object.entries(categoryTotals).map(([category, { correct, total }]) => [
              category,
              calculatePercentage(correct, total),
            ]),
          );

          // Build source map by querying all user quizzes and mapping question IDs to source quiz IDs
          const allQuizzes = await db.quizzes
            .where("user_id")
            .equals(effectiveUserId)
            .filter((q) => !q.deleted_at)
            .toArray();
          const sourceMap: Record<string, string> = {};
          for (const q of allQuizzes) {
            for (const question of q.questions) {
              if (actualQuestionIds.includes(question.id) && !sourceMap[question.id]) {
                sourceMap[question.id] = q.id;
              }
            }
          }

          const result = await createSRSReviewResult({
            userId: effectiveUserId,
            srsQuizId: srsQuiz.id,
            answers: answersRecord,
            flaggedQuestions: Array.from(flaggedQuestions),
            timeTakenSeconds,
            questionIds: actualQuestionIds,
            score,
            categoryBreakdown,
            sourceMap,
          });

          clearSRSReviewState();
          addToast("success", "SRS Review complete! Keep up the great work.");
          void sync().catch((syncErr) => {
            console.warn("Background sync failed after SRS review save:", syncErr);
          });
          router.push(`/results/${result.id}`);
        } catch (err) {
          console.error("Failed to save SRS review result:", err);
          addToast("error", "Failed to save result. You can still continue studying.");
          clearSRSReviewState();
          router.push("/study-due");
        }
        return;
      }

      if (isTopicStudy && effectiveUserId) {
        try {
          const srsQuiz = await getOrCreateSRSQuiz(effectiveUserId);
          const questionMap = new Map(questions.map((q) => [q.id, q]));
          let correctCount = 0;
          const categoryTotals: Record<string, { correct: number; total: number }> = {};
          const answersRecord: Record<string, string> = {};
          const actualQuestionIds: string[] = [];

          answers.forEach((record, questionId) => {
            answersRecord[questionId] = record.selectedAnswer;
            const question = questionMap.get(questionId);
            if (!question) return;

            actualQuestionIds.push(questionId);
            const category = question.category || "Uncategorized";
            if (!categoryTotals[category]) {
              categoryTotals[category] = { correct: 0, total: 0 };
            }
            categoryTotals[category].total += 1;

            if (record.isCorrect) {
              correctCount += 1;
              categoryTotals[category].correct += 1;
            }
          });

          const score = calculatePercentage(correctCount, answers.size);
          const categoryBreakdown = Object.fromEntries(
            Object.entries(categoryTotals).map(([category, { correct, total }]) => [
              category,
              calculatePercentage(correct, total),
            ]),
          );

          // Build source map by querying all user quizzes and mapping question IDs to source quiz IDs
          const allQuizzes = await db.quizzes
            .where("user_id")
            .equals(effectiveUserId)
            .filter((q) => !q.deleted_at)
            .toArray();
          const sourceMap: Record<string, string> = {};
          for (const q of allQuizzes) {
            for (const question of q.questions) {
              if (actualQuestionIds.includes(question.id) && !sourceMap[question.id]) {
                sourceMap[question.id] = q.id;
              }
            }
          }

          const result = await createTopicStudyResult({
            userId: effectiveUserId,
            srsQuizId: srsQuiz.id,
            answers: answersRecord,
            flaggedQuestions: Array.from(flaggedQuestions),
            timeTakenSeconds,
            questionIds: actualQuestionIds,
            score,
            categoryBreakdown,
            sourceMap,
          });

          clearTopicStudyState();
          addToast("success", "Topic Study complete! Great progress.");
          void sync().catch((syncErr) => {
            console.warn("Background sync failed after Topic Study save:", syncErr);
          });
          router.push(`/results/${result.id}`);
        } catch (err) {
          console.error("Failed to save topic study result:", err);
          addToast("error", "Failed to save result. You can still continue studying.");
          clearTopicStudyState();
          router.push("/analytics");
        }
        return;
      }

      // Handle Interleaved Practice session completion
      if (isInterleaved && effectiveUserId) {
        try {
          const srsQuiz = await getOrCreateSRSQuiz(effectiveUserId);
          const questionMap = new Map(questions.map((q) => [q.id, q]));
          let correctCount = 0;
          const categoryTotals: Record<string, { correct: number; total: number }> = {};
          // Translate remixed keys to original keys for consistent analytics
          const answersRecord = buildAnswersRecord(answers, interleavedKeyMappings);
          const actualQuestionIds: string[] = [];

          Object.keys(answersRecord).forEach((questionId) => {
            const question = questionMap.get(questionId);
            if (!question) return;

            actualQuestionIds.push(questionId);
            const category = question.category || "Uncategorized";
            if (!categoryTotals[category]) {
              categoryTotals[category] = { correct: 0, total: 0 };
            }
            categoryTotals[category].total += 1;

            // Get isCorrect from original answers Map
            const answerRecord = answers.get(questionId);
            if (answerRecord?.isCorrect) {
              correctCount += 1;
              categoryTotals[category].correct += 1;
            }
          });

          const score = calculatePercentage(correctCount, answers.size);
          const categoryBreakdown = Object.fromEntries(
            Object.entries(categoryTotals).map(([category, { correct, total }]) => [
              category,
              calculatePercentage(correct, total),
            ]),
          );

          // Convert sourceMap to plain object
          // Note: Map.forEach iterates as (value, key), not (key, value)
          const sourceMapObject: Record<string, string> = {};
          interleavedSourceMap?.forEach((sourceQuizId, questionIdKey) => {
            sourceMapObject[questionIdKey] = sourceQuizId;
          });

          const result = await createInterleavedResult({
            userId: effectiveUserId,
            srsQuizId: srsQuiz.id,
            answers: answersRecord,
            flaggedQuestions: Array.from(flaggedQuestions),
            timeTakenSeconds,
            questionIds: actualQuestionIds,
            sourceMap: sourceMapObject,
            score,
            categoryBreakdown,
            categoryScores: categoryTotals,
          });

          clearInterleavedState();
          addToast("success", "Interleaved Practice complete! Great job.");
          void sync().catch((syncErr) => {
            console.warn("Background sync failed after Interleaved save:", syncErr);
          });
          router.push(`/results/${result.id}`);
        } catch (err) {
          console.error("Failed to save interleaved result:", err);
          addToast("error", "Failed to save result. You can still continue studying.");
          clearInterleavedState();
          router.push("/interleaved");
        }
        return;
      }

      await submitQuiz(timeTakenSeconds);
    },
    [isSRSReview, isTopicStudy, isInterleaved, effectiveUserId, answers, questions, flaggedQuestions, interleavedSourceMap, interleavedKeyMappings, addToast, router, submitQuiz, sync],
  );

  const retrySave = React.useCallback((): void => {
    const elapsedSeconds = completionTimeRef.current;
    if (elapsedSeconds === null) return;
    retrySaveAction(elapsedSeconds);
  }, [retrySaveAction]);

  React.useEffect(() => {
    let mounted = true;
    const init = async (): Promise<void> => {
      setIsInitializing(true);
      hasSavedResultRef.current = false;

      if (searchParams?.get("remix") === "true") {
        try {
          const { quiz: remixedQuiz, keyMappings } = await remixQuiz(quiz);
          if (!mounted) return; // Guard against unmount during async
          initializeSession(
            quiz.id,
            "zen",
            remixedQuiz.questions,
            keyMappings
          );
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
      hasSavedResultRef.current = false;
    };
  }, [quiz, initializeSession, startTimer, resetSession, searchParams]);

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
    if (isSmartRound) clearSmartRoundState();
    if (isSRSReview) {
      clearSRSReviewState();
      router.push("/study-due");
      return;
    }
    if (isTopicStudy) {
      clearTopicStudyState();
      router.push("/analytics");
      return;
    }
    if (isInterleaved) {
      clearInterleavedState();
      router.push("/interleaved");
      return;
    }
    router.push("/");
  }, [resetSession, isSmartRound, isSRSReview, isTopicStudy, isInterleaved, router]);

  const isCurrentAnswerCorrect = React.useMemo(() => {
    if (!currentQuestion || !hasSubmitted) return false;
    const answerRecord = answers.get(currentQuestion.id);
    return answerRecord?.isCorrect ?? false;
  }, [currentQuestion, hasSubmitted, answers]);

  const { resolvedAnswers, isResolving } = useCorrectAnswer(
    currentQuestion?.id ?? null,
    currentQuestion?.correct_answer_hash ?? null,
    currentQuestion?.options,
  );

  const currentCorrectAnswer = currentQuestion
    ? resolvedAnswers[currentQuestion.id] || currentQuestion.correct_answer
    : undefined;

  const isLastQuestion = currentIndex >= questionQueue.length - 1;

  React.useEffect(() => {
    if (hasSubmitted && isCurrentAnswerCorrect) {
      addToast("success", "Correct! 🎉");
    }
  }, [hasSubmitted, isCurrentAnswerCorrect, addToast]);

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
      answerRecord.isCorrect,
    ).catch((err) => {
      console.warn("Failed to update SRS state:", err);
      srsUpdatedQuestionsRef.current.delete(currentQuestion.id);
    });
  }, [isSRSReview, hasSubmitted, currentQuestion, effectiveUserId, answers]);

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
        <div className="py-12 text-center" aria-busy="true">
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
