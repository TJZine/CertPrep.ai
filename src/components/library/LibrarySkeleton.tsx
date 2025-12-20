"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { QuizCardSkeleton } from "@/components/dashboard/QuizCardSkeleton";

export function LibrarySkeleton(): React.ReactElement {
  return (
    <main
      data-testid="library-main"
      className="mx-auto min-h-[calc(100dvh-65px)] max-w-5xl px-4 py-8 sm:px-6 lg:px-8"
      role="status"
      aria-label="Loading library"
    >
      <span className="sr-only">Loading library...</span>

      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-9 w-44" />
          </div>
          <Skeleton className="h-5 w-full max-w-[36rem]" />
        </div>
        <Skeleton className="h-10 w-44" />
      </div>

      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-full max-w-[28rem]" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <QuizCardSkeleton key={i} />
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

