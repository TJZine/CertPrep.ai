import * as React from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { useSync } from "@/hooks/useSync";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { useAuth } from "@/components/providers/AuthProvider";
import { useQuizSubmission } from "@/hooks/useQuizSubmission";
import { clearSmartRoundState } from "@/lib/storage/smartRoundStorage";
import { clearSRSReviewState } from "@/lib/storage/srsReviewStorage";
import { clearTopicStudyState } from "@/lib/storage/topicStudyStorage";
import { clearInterleavedState } from "@/lib/storage/interleavedStorage";
import { ensureSRSQuizExists } from "@/db/quizzes";
import {
  createSRSReviewResult,
  createTopicStudyResult,
  createInterleavedResult,
} from "@/db/results";
import { calculatePercentage } from "@/lib/utils/math";
import { buildAnswersRecord } from "@/lib/quiz/quizRemix";

import type { Question, QuizSessionConfig } from "@/types/quiz";

const AGGREGATED_SAVE_ERROR_MESSAGE =
  "Failed to save result. Your answers are still here—retry when ready.";

function mapSourceMapToObject(
  sourceMap: Map<string, string> | null | undefined,
): Record<string, string> {
  if (!sourceMap) {
    return {};
  }

  return Object.fromEntries(sourceMap);
}

interface UseQuizPersistenceProps {
  config: QuizSessionConfig;
  questions: Question[];
  answers: Map<string, { selectedAnswer: string; isCorrect: boolean }>;
  flaggedQuestions: Set<string>;
  standardZenDraftOwnerId?: string | null;
}

export function useQuizPersistence({
  config,
  questions,
  answers,
  flaggedQuestions,
  standardZenDraftOwnerId = null,
}: UseQuizPersistenceProps): {
  saveError: boolean;
  submitQuiz: (timeTakenSeconds: number) => Promise<void>;
  retrySave: (timeTakenSeconds: number) => void;
  clearSessionStorage: () => void;
  effectiveUserId: string | null;
} {
  const {
    quizId,
    isSmartRound = false,
    isSRSReview = false,
    isTopicStudy = false,
    isInterleaved = false,
    sourceMap: configSourceMap = null,
    keyMappings: configKeyMappings = null,
  } = config;

  const router = useRouter();
  const { addToast } = useToast();
  const { sync } = useSync();
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId(user?.id);
  const [aggregatedSaveError, setAggregatedSaveError] = React.useState(false);

  const {
    saveError,
    submitQuiz,
    retrySave: retrySaveAction,
  } = useQuizSubmission({
    quizId,
    isSmartRound,
    standardZenDraftOwnerId,
  });

  const handleSessionComplete = React.useCallback(
    async (timeTakenSeconds: number): Promise<void> => {
      // SRS review sessions save results differently
      if (isSRSReview && effectiveUserId) {
        setAggregatedSaveError(false);
        try {
          const srsQuiz = await ensureSRSQuizExists(effectiveUserId);
          const questionMap = new Map(questions.map((q) => [q.id, q]));
          let correctCount = 0;
          const categoryTotals: Record<
            string,
            { correct: number; total: number }
          > = {};
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
            Object.entries(categoryTotals).map(
              ([category, { correct, total }]) => [
                category,
                calculatePercentage(correct, total),
              ],
            ),
          );

          // Reuse the source map captured when the aggregated session was hydrated.
          const result = await createSRSReviewResult({
            userId: effectiveUserId,
            srsQuizId: srsQuiz.id,
            answers: answersRecord,
            flaggedQuestions: Array.from(flaggedQuestions),
            timeTakenSeconds,
            questionIds: actualQuestionIds,
            score,
            categoryBreakdown,
            sourceMap: mapSourceMapToObject(configSourceMap),
          });

          clearSRSReviewState();
          addToast("success", "SRS Review complete! Keep up the great work.");
          void sync().catch((syncErr) => {
            console.warn(
              "Background sync failed after SRS review save:",
              syncErr,
            );
          });
          router.push(`/results/${result.id}`);
        } catch (err) {
          console.error("Failed to save SRS review result:", err);
          setAggregatedSaveError(true);
          addToast("error", AGGREGATED_SAVE_ERROR_MESSAGE);
          return;
        }
        return;
      }

      if (isTopicStudy && effectiveUserId) {
        setAggregatedSaveError(false);
        try {
          const srsQuiz = await ensureSRSQuizExists(effectiveUserId);
          const questionMap = new Map(questions.map((q) => [q.id, q]));
          let correctCount = 0;
          const categoryTotals: Record<
            string,
            { correct: number; total: number }
          > = {};
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
            Object.entries(categoryTotals).map(
              ([category, { correct, total }]) => [
                category,
                calculatePercentage(correct, total),
              ],
            ),
          );

          // Reuse the source map captured when the aggregated session was hydrated.
          const result = await createTopicStudyResult({
            userId: effectiveUserId,
            srsQuizId: srsQuiz.id,
            answers: answersRecord,
            flaggedQuestions: Array.from(flaggedQuestions),
            timeTakenSeconds,
            questionIds: actualQuestionIds,
            score,
            categoryBreakdown,
            sourceMap: mapSourceMapToObject(configSourceMap),
          });

          clearTopicStudyState();
          addToast("success", "Topic Study complete! Great progress.");
          void sync().catch((syncErr) => {
            console.warn(
              "Background sync failed after Topic Study save:",
              syncErr,
            );
          });
          router.push(`/results/${result.id}`);
        } catch (err) {
          console.error("Failed to save topic study result:", err);
          setAggregatedSaveError(true);
          addToast("error", AGGREGATED_SAVE_ERROR_MESSAGE);
          return;
        }
        return;
      }

      // Handle Interleaved Practice session completion
      if (isInterleaved && effectiveUserId) {
        setAggregatedSaveError(false);
        try {
          const srsQuiz = await ensureSRSQuizExists(effectiveUserId);
          const questionMap = new Map(questions.map((q) => [q.id, q]));
          let correctCount = 0;
          const categoryTotals: Record<
            string,
            { correct: number; total: number }
          > = {};
          // Translate remixed keys to original keys for consistent analytics
          const answersRecord = buildAnswersRecord(answers, configKeyMappings);
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
            Object.entries(categoryTotals).map(
              ([category, { correct, total }]) => [
                category,
                calculatePercentage(correct, total),
              ],
            ),
          );

          // Convert sourceMap to plain object
          const result = await createInterleavedResult({
            userId: effectiveUserId,
            srsQuizId: srsQuiz.id,
            answers: answersRecord,
            flaggedQuestions: Array.from(flaggedQuestions),
            timeTakenSeconds,
            questionIds: actualQuestionIds,
            sourceMap: mapSourceMapToObject(configSourceMap),
            score,
            categoryBreakdown,
            categoryScores: categoryTotals,
          });

          clearInterleavedState();
          addToast("success", "Interleaved Practice complete! Great job.");
          void sync().catch((syncErr) => {
            console.warn(
              "Background sync failed after Interleaved save:",
              syncErr,
            );
          });
          router.push(`/results/${result.id}`);
        } catch (err) {
          console.error("Failed to save interleaved result:", err);
          setAggregatedSaveError(true);
          addToast("error", AGGREGATED_SAVE_ERROR_MESSAGE);
          return;
        }
        return;
      }

      await submitQuiz(timeTakenSeconds, answers, flaggedQuestions);
    },
    [
      isSRSReview,
      isTopicStudy,
      isInterleaved,
      effectiveUserId,
      answers,
      questions,
      flaggedQuestions,
      configSourceMap,
      configKeyMappings,
      addToast,
      router,
      submitQuiz,
      sync,
    ],
  );

  const clearSessionStorage = React.useCallback(() => {
    if (isSmartRound) clearSmartRoundState();
    if (isSRSReview) clearSRSReviewState();
    if (isTopicStudy) clearTopicStudyState();
    if (isInterleaved) clearInterleavedState();
  }, [isSmartRound, isSRSReview, isTopicStudy, isInterleaved]);

  const retrySave = React.useCallback(
    (timeTakenSeconds: number): void => {
      if (isSRSReview || isTopicStudy || isInterleaved) {
        void handleSessionComplete(timeTakenSeconds);
        return;
      }

      retrySaveAction(timeTakenSeconds);
    },
    [
      handleSessionComplete,
      isSRSReview,
      isTopicStudy,
      isInterleaved,
      retrySaveAction,
    ],
  );

  return {
    saveError: saveError || aggregatedSaveError,
    submitQuiz: handleSessionComplete,
    retrySave,
    clearSessionStorage,
    effectiveUserId,
  };
}
