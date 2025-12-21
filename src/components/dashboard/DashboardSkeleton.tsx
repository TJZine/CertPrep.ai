"use client";

import * as React from "react";
import { BookOpen } from "lucide-react";
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
    // Allow 0 for empty state (LCP optimization), otherwise clamp to 1-12
    const cardCount = Math.min(12, Math.max(0, Math.floor(quizCardCount)));

    return (
        <DashboardShell
            headerSlot={<HeaderSkeleton />}
            statsSlot={<StatsBarSkeleton />}
            srsSlot={
                <div className="mx-auto grid max-w-2xl gap-4 md:grid-cols-2">
                    <SRSPlaceholderSkeleton />
                    <InterleavedPlaceholderSkeleton />
                </div>
            }
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
        <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-3" aria-hidden="true">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-4" />
        </div>
    );
}

/**
 * InterleavedPracticeCard skeleton - matches the card structure
 * Renders as a Card with header + button placeholder
 */
function InterleavedPlaceholderSkeleton(): React.ReactElement {
    return (
        <Card className="border-primary/20" aria-hidden="true">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-5 w-36" />
                </div>
                <Skeleton className="mt-1 h-4 w-48" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-10 w-full rounded-md" />
            </CardContent>
        </Card>
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
                {/* Last attempt date placeholder - matches QuizCard line 389 */}
                <Skeleton className="h-[28px] w-full rounded-lg" />
            </CardContent>
            <CardFooter className="pt-0">
                <Skeleton className="h-10 w-full" />
            </CardFooter>
        </Card>
    );
}

/**
 * Empty state skeleton - renders actual text for LCP optimization.
 * 
 * The LCP element on the dashboard is the empty state description text.
 * By rendering this with real text (not skeleton placeholders), we allow
 * the browser to paint the LCP element immediately during the loading phase,
 * dramatically improving LCP scores on mobile.
 */
function EmptyStateSkeleton(): React.ReactElement {
    return (
        <div
            className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center"
        >
            <div
                className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground"
                aria-hidden="true"
            >
                <BookOpen className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
                No quizzes yet
            </h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Import your first quiz to get started. Upload a JSON file or paste quiz data.
            </p>
        </div>
    );
}

/**
 * QuizGrid skeleton - grid of quiz card skeletons or empty state.
 * 
 * When count is 0's, we render the actual EmptyState structure with real text
 * to optimize LCP. When count > 0, we render skeleton cards.
 */
function QuizGridSkeleton({ count }: { count: number }): React.ReactElement {
    // For new users or when we know there are no quizzes,
    // render the EmptyState structure immediately for LCP optimization
    if (count === 0) {
        return <EmptyStateSkeleton />;
    }

    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: count }).map((_, i) => (
                <QuizCardSkeleton key={i} />
            ))}
        </div>
    );
}

export default DashboardSkeleton;
