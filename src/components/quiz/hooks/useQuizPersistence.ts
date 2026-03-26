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
import { createSRSReviewResult, createTopicStudyResult, createInterleavedResult } from "@/db/results";
import { calculatePercentage } from "@/lib/utils/math";
import { buildAnswersRecord } from "@/lib/quiz/quizRemix";
import { db } from "@/db";
import { logger } from "@/lib/logger";

import type { Question, QuizSessionConfig } from "@/types/quiz";

/**
 * Build a source map from question IDs to their source quiz IDs.
 * Used for aggregated sessions (SRS Review, Topic Study) to track question origins.
 */
async function buildSourceMapFromUserQuizzes(
  userId: string,
  questionIds: string[],
): Promise<Record<string, string>> {
  try {
    const allQuizzes = await db.quizzes
      .where("user_id")
      .equals(userId)
      .filter((q) => !q.deleted_at)
      .toArray();

    // Warn if quiz count is unexpectedly high (potential perf issue)
    if (allQuizzes.length > 500) {
      logger.warn(`High quiz count (${allQuizzes.length}) for user ${userId}`);
    }

    const questionToQuizMap = new Map<string, string>();
    for (const q of allQuizzes) {
      for (const question of q.questions) {
        if (!questionToQuizMap.has(question.id)) {
          questionToQuizMap.set(question.id, q.id);
        }
      }
    }

    const sourceMap: Record<string, string> = {};
    for (const qId of questionIds) {
      const quizId = questionToQuizMap.get(qId);
      if (quizId) sourceMap[qId] = quizId;
    }
    return sourceMap;
  } catch (error) {
    logger.error("Failed to build source map", { userId, error });
    return {}; // Fail gracefully - sourceMap is optional for display
  }
}

interface UseQuizPersistenceProps {
  config: QuizSessionConfig;
  questions: Question[];
  answers: Map<string, { selectedAnswer: string; isCorrect: boolean }>;
  flaggedQuestions: Set<string>;
}

export function useQuizPersistence({
  config,
  questions,
  answers,
  flaggedQuestions,
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

  const {
    saveError,
    submitQuiz,
    retrySave: retrySaveAction,
  } = useQuizSubmission({
    quizId,
    isSmartRound,
  });

  const handleSessionComplete = React.useCallback(
    async (timeTakenSeconds: number): Promise<void> => {
      // SRS review sessions save results differently
      if (isSRSReview && effectiveUserId) {
        try {
          const srsQuiz = await ensureSRSQuizExists(effectiveUserId);
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
          const sourceMap = await buildSourceMapFromUserQuizzes(effectiveUserId, actualQuestionIds);

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
          return;
        }
        return;
      }

      if (isTopicStudy && effectiveUserId) {
        try {
          const srsQuiz = await ensureSRSQuizExists(effectiveUserId);
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
          const sourceMap = await buildSourceMapFromUserQuizzes(effectiveUserId, actualQuestionIds);

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
          return;
        }
        return;
      }

      // Handle Interleaved Practice session completion
      if (isInterleaved && effectiveUserId) {
        try {
          const srsQuiz = await ensureSRSQuizExists(effectiveUserId);
          const questionMap = new Map(questions.map((q) => [q.id, q]));
          let correctCount = 0;
          const categoryTotals: Record<string, { correct: number; total: number }> = {};
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
            Object.entries(categoryTotals).map(([category, { correct, total }]) => [
              category,
              calculatePercentage(correct, total),
            ]),
          );

          // Convert sourceMap to plain object
          const sourceMapObject: Record<string, string> = {};
          configSourceMap?.forEach((sourceQuizId: string, questionIdKey: string) => {
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
      sync
    ],
  );

  const clearSessionStorage = React.useCallback(() => {
    if (isSmartRound) clearSmartRoundState();
    if (isSRSReview) clearSRSReviewState();
    if (isTopicStudy) clearTopicStudyState();
    if (isInterleaved) clearInterleavedState();
  }, [isSmartRound, isSRSReview, isTopicStudy, isInterleaved]);

  return {
    saveError,
    submitQuiz: handleSessionComplete,
    retrySave: retrySaveAction,
    clearSessionStorage,
    effectiveUserId,
  };
}
