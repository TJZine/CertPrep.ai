"use client";

import * as React from "react";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { ProctorQuizContainer } from "@/components/quiz/ProctorQuizContainer";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { Button } from "@/components/ui/Button";
import { useInitializeDatabase, useQuiz } from "@/hooks/useDatabase";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";

/**
 * Page entry for Proctor exam mode.
 */
export default function ProctorModePage(): React.ReactElement {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;

  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId(user?.id);

  const { isInitialized, error: dbError } = useInitializeDatabase();
  const { quiz, isLoading } = useQuiz(
    isInitialized ? quizId : undefined,
    effectiveUserId ?? undefined,
  );

  if (dbError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md rounded-lg border border-destructive/50 bg-card p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h1 className="mt-4 text-xl font-semibold text-foreground">
            Database Error
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {dbError.message}
          </p>
          <Button
            className="mt-6"
            onClick={() => router.push("/")}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!isInitialized || !effectiveUserId || (isLoading && !quiz)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingSpinner size="lg" text="Preparing your exam..." />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-warning" />
          <h1 className="mt-4 text-xl font-semibold text-foreground">
            Quiz Not Found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The quiz you&apos;re looking for doesn&apos;t exist or may have been
            deleted.
          </p>
          <Button
            className="mt-6"
            onClick={() => router.push("/")}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (quiz.questions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-warning" />
          <h1 className="mt-4 text-xl font-semibold text-foreground">
            No Questions
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This quiz doesn&apos;t have any questions yet.
          </p>
          <Button
            className="mt-6"
            onClick={() => router.push("/")}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const calculatedDuration = Math.min(
    Math.max(Math.ceil(quiz.questions.length * 1.5), 10),
    180,
  );

  return (
    <ErrorBoundary
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="max-w-md rounded-lg border border-destructive/50 bg-card p-6 text-center shadow-sm">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
            <h1 className="mt-4 text-xl font-semibold text-foreground">
              Something Went Wrong
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              An error occurred during the exam. Your progress may not be saved.
            </p>
            <Button
              className="mt-6"
              onClick={() => router.push("/")}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      }
    >
      <ProctorQuizContainer quiz={quiz} durationMinutes={calculatedDuration} />
    </ErrorBoundary>
  );
}
