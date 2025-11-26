'use client';

import * as React from 'react';
import { ArrowLeft, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useQuizzes, useInitializeDatabase } from '@/hooks/useDatabase';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { TestLibrary } from '@/components/dashboard/TestLibrary';
import { buttonVariants } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export default function LibraryPage(): React.ReactElement {
  const { isInitialized, error: dbError } = useInitializeDatabase();
  const { quizzes, isLoading } = useQuizzes();

  if (!isInitialized || isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" text="Loading library..." />
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-500/50 dark:bg-red-950">
          <h1 className="text-xl font-semibold text-red-800 dark:text-red-100">Database Error</h1>
          <p className="mt-2 text-sm text-red-700 dark:text-red-200">
            {dbError.message || 'An unexpected error occurred. Please refresh and try again.'}
          </p>
          <Link
            href="/"
            aria-label="Return to dashboard"
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'mt-4 inline-flex w-auto',
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
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900 dark:text-slate-50">
            <BookOpen className="h-7 w-7" aria-hidden="true" />
            Test Library
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-300">
            Browse curated practice tests and import them into your personal library.
          </p>
        </div>
        <Link
          href="/"
          aria-label="Back to dashboard"
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'inline-flex w-auto',
          )}
        >
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Back to Dashboard
        </Link>
      </div>

      <TestLibrary
        existingQuizzes={quizzes ?? []}
        onImportSuccess={(): void => {
          // No-op: useQuizzes live query will refresh imported state automatically.
        }}
      />
    </main>
  );
}
