"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardContent } from "@/components/ui/Card";

export interface AnalyticsSkeletonProps {
    /** Optional text shown during sync (e.g., "Syncing...") */
    syncingText?: string;
}

/**
 * Skeleton for AnalyticsOverview stat cards.
 * Exported separately for progressive loading in the analytics page.
 */
export function AnalyticsOverviewSkeleton(): React.ReactElement {
    return (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-hidden="true">
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
 * Skeleton loading state for the Analytics page.
 * Shows REAL header immediately with skeleton placeholders for cards
 * to improve LCP and eliminate CLS during data loading.
 */
export function AnalyticsSkeleton({
    syncingText,
}: AnalyticsSkeletonProps): React.ReactElement {
    return (
        <div
            className="mx-auto max-w-7xl overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8"
            role="status"
            aria-label="Loading analytics"
        >
            <span className="sr-only">Loading your analytics data...</span>

            {/* REAL Header - render immediately (not skeletonized) */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
                    <p className="mt-1 text-muted-foreground">
                        Track your progress and identify areas for improvement
                    </p>
                    {syncingText && (
                        <p className="mt-2 animate-pulse text-sm text-muted-foreground">
                            {syncingText}
                        </p>
                    )}
                </div>
                {/* DateRangeFilter skeleton */}
                <Skeleton className="h-10 w-32" aria-hidden="true" />
            </div>

            {/* ExamReadinessCard skeleton */}
            <div className="mb-8" aria-hidden="true">
                <Card className="min-h-[400px] p-6 [contain:layout]">
                    <Skeleton className="mb-4 h-8 w-48" />
                    <Skeleton className="mb-4 h-32 w-full" />
                    <Skeleton className="h-16 w-full" />
                </Card>
            </div>

            {/* StreakCard skeleton */}
            <div className="mb-8" aria-hidden="true">
                <Card className="min-h-[380px] p-6 [contain:layout]">
                    <Skeleton className="mb-4 h-6 w-32" />
                    <div className="grid grid-cols-3 gap-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-20" />
                        ))}
                    </div>
                    <Skeleton className="mt-6 h-20 w-full" />
                </Card>
            </div>

            {/* AnalyticsOverview skeleton (stats grid) */}
            <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4" aria-hidden="true">
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

            {/* PerformanceHistory chart skeleton */}
            <div className="mb-8" aria-hidden="true">
                <Card className="min-h-[380px] p-6">
                    <Skeleton className="mb-4 h-6 w-40" />
                    <Skeleton className="h-52 w-full" />
                </Card>
            </div>

            {/* Recent Results + Weak Areas skeleton (side-by-side) */}
            <div className="mb-8 grid gap-8 lg:grid-cols-2" aria-hidden="true">
                <Card className="min-h-[200px] p-6">
                    <Skeleton className="mb-4 h-6 w-32" />
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                </Card>
                <Card className="min-h-[200px] p-6">
                    <Skeleton className="mb-4 h-6 w-36" />
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                </Card>
            </div>

            {/* Topic Heatmap skeleton */}
            <div className="mb-8" aria-hidden="true">
                <Card className="min-h-[560px] p-6 [contain:layout]">
                    <Skeleton className="mb-4 h-6 w-40" />
                    <Skeleton className="mb-2 h-4 w-64" />
                    <Skeleton className="h-80 w-full" />
                </Card>
            </div>

            {/* Category Trends skeleton */}
            <div className="mb-8" aria-hidden="true">
                <Card className="min-h-[380px] p-6">
                    <Skeleton className="mb-4 h-6 w-40" />
                    <Skeleton className="h-72 w-full" />
                </Card>
            </div>

            {/* Retry Comparison skeleton */}
            <div className="mb-8" aria-hidden="true">
                <Card className="min-h-[280px] p-6">
                    <Skeleton className="mb-4 h-6 w-44" />
                    <div className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                </Card>
            </div>
        </div>
    );
}
