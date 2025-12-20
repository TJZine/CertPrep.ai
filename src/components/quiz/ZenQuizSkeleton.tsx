"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Skeleton loading state for Zen mode quiz page.
 * Shows a centered loading indicator that matches the quiz interface shell.
 */
export function ZenQuizSkeleton(): React.ReactElement {
    return (
        <div
            className="flex min-h-screen flex-col bg-background"
            role="status"
            aria-label="Loading quiz"
        >
            <span className="sr-only">Loading your quiz...</span>

            {/* Top bar skeleton */}
            <div
                className="border-b border-border bg-card px-4 py-3"
                aria-hidden="true"
            >
                <div className="mx-auto flex max-w-3xl items-center justify-between">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-8 w-20" />
                </div>
            </div>

            {/* Question area skeleton */}
            <div
                className="flex-1 px-4 py-8"
                aria-hidden="true"
            >
                <div className="mx-auto max-w-3xl">
                    {/* Progress indicator */}
                    <Skeleton className="mb-6 h-2 w-full rounded-full" />

                    {/* Question card */}
                    <div className="rounded-xl border border-border bg-card p-6">
                        {/* Category badge */}
                        <Skeleton className="mb-4 h-6 w-24 rounded-full" />

                        {/* Question text */}
                        <Skeleton className="mb-2 h-6 w-full" />
                        <Skeleton className="mb-6 h-6 w-3/4" />

                        {/* Answer options */}
                        <div className="space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton
                                    key={i}
                                    className="h-14 w-full rounded-lg"
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom navigation skeleton */}
            <div
                className="border-t border-border bg-card px-4 py-4"
                aria-hidden="true"
            >
                <div className="mx-auto flex max-w-3xl justify-between">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-24" />
                </div>
            </div>
        </div>
    );
}
