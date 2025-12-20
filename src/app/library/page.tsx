"use client";

import * as React from "react";
import { ArrowLeft, BookOpen } from "lucide-react";
import Link from "next/link";
import { useQuizzes, useInitializeDatabase } from "@/hooks/useDatabase";
import { TestLibrary } from "@/components/dashboard/TestLibrary";
import { LibrarySkeleton } from "@/components/library/LibrarySkeleton";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";

export default function LibraryPage(): React.ReactElement {
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId(user?.id);
  const { isInitialized, error: dbError } = useInitializeDatabase();
  const { quizzes, isLoading, error: quizzesError } = useQuizzes(
    effectiveUserId ?? undefined,
  );

  if (!isInitialized || !effectiveUserId || isLoading) {
    return <LibrarySkeleton />;
  }

  if (dbError || quizzesError) {
    const message =
      dbError?.message ??
      quizzesError?.message ??
      "An unexpected error occurred. Please refresh and try again.";
    return (
      <div className="mx-auto min-h-[calc(100dvh-var(--header-height))] max-w-4xl px-4 py-10">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <h1 className="text-xl font-semibold text-destructive">
            Database Error
          </h1>
          <p className="mt-2 text-sm text-destructive">
            {message}
          </p>
          <Link
            href="/"
            aria-label="Return to dashboard"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "mt-4 inline-flex w-auto",
            )}
          >
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main data-testid="library-main" className="mx-auto min-h-[calc(100dvh-var(--header-height))] max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-foreground">
            <BookOpen className="h-7 w-7" aria-hidden="true" />
            Test Library
          </h1>
          <p className="mt-1 text-muted-foreground">
            Browse curated practice tests and import them into your personal
            library.
          </p>
        </div>
        <Link
          href="/"
          aria-label="Back to dashboard"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "inline-flex w-auto",
          )}
        >
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Back to Dashboard
        </Link>
      </div>

      <TestLibrary
        existingQuizzes={quizzes ?? []}
        userId={effectiveUserId}
        onImportSuccess={(): void => {
          // No-op: useQuizzes live query will refresh imported state automatically.
        }}
      />
    </main>
  );
}
