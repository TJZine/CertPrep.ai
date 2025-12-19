"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/Card";
import { DashboardShell } from "./DashboardShell";

interface DashboardSkeletonProps {
    /**
     * Number of quiz cards to render in the skeleton.
     * Defaults to 6 for a reasonable first-load appearance.
     */
    quizCardCount?: number;
}

/**
 * Skeleton loading state for the Dashboard page.
 * Uses DashboardShell for consistent layout with loaded content.
 */
export function DashboardSkeleton({
    quizCardCount = 6,
}: DashboardSkeletonProps): React.ReactElement {
    const cardCount = Math.min(12, Math.max(1, Math.floor(quizCardCount)));

    return (
        <DashboardShell
            headerSlot={<HeaderSkeleton />}
            statsSlot={<StatsBarSkeleton />}
            srsSlot={<SRSPlaceholderSkeleton />}
            contentSlot={<QuizGridSkeleton count={cardCount} />}
            aria-label="Loading dashboard"
            isLoading
        />
    );
}

/**
 * Header skeleton - matches DashboardHeader layout
 */
function HeaderSkeleton(): React.ReactElement {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
                <Skeleton className="h-9 w-48" />
                <Skeleton className="h-5 w-64" />
            </div>
            <Skeleton className="h-10 w-32" />
        </div>
    );
}

/**
 * StatsBar skeleton - matches StatsBar 4-column grid layout
 */
function StatsBarSkeleton(): React.ReactElement {
    return (
        <div className="grid min-h-[100px] grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                    <CardContent className="flex items-center gap-4 p-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-7 w-16" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

/**
 * SRS DueQuestionsCard skeleton - compact placeholder
 * Matches the compact empty state height (~48px)
 */
function SRSPlaceholderSkeleton(): React.ReactElement {
    return (
        <div className="flex justify-center" aria-hidden="true">
            <div className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-3">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-4" />
            </div>
        </div>
    );
}

/**
 * Quiz card skeleton - matches QuizCard layout
 */
function QuizCardSkeleton(): React.ReactElement {
    return (
        <Card className="flex h-full flex-col">
            <CardHeader className="pb-4">
                <div className="space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="mt-3 flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-4 pt-0">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, j) => (
                        <Skeleton key={j} className="h-16 rounded-lg" />
                    ))}
                </div>
            </CardContent>
            <CardFooter className="pt-0">
                <Skeleton className="h-10 w-full" />
            </CardFooter>
        </Card>
    );
}

/**
 * QuizGrid skeleton - grid of quiz card skeletons
 */
function QuizGridSkeleton({ count }: { count: number }): React.ReactElement {
    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: count }).map((_, i) => (
                <QuizCardSkeleton key={i} />
            ))}
        </div>
    );
}

export default DashboardSkeleton;
