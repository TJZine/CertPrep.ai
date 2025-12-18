"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/Card";

interface DashboardSkeletonProps {
    /**
     * Skeleton variant for progressive loading:
     * - minimal: Auth loading - header + centered spinner
     * - empty: No quizzes expected - header + empty state placeholder
     * - populated: Quizzes expected - full StatsBar + 6 quiz cards (default)
     */
    variant?: "minimal" | "empty" | "populated";
}

/**
 * Skeleton loading state for the Dashboard page.
 * Supports multiple variants for auth-aware progressive loading.
 */
export function DashboardSkeleton({
    variant = "populated",
}: DashboardSkeletonProps): React.ReactElement {
    switch (variant) {
        case "minimal":
            return <MinimalSkeleton />;
        case "empty":
            return <EmptyDashboardSkeleton />;
        case "populated":
        default:
            return <PopulatedDashboardSkeleton />;
    }
}

/**
 * Minimal skeleton shown during auth resolution.
 * Just header + subtle centered spinner to avoid layout shift.
 */
function MinimalSkeleton(): React.ReactElement {
    return (
        <div
            className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
            role="status"
            aria-label="Loading"
        >
            <span className="sr-only">Loading...</span>
            {/* Header skeleton */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-9 w-48" />
                    <Skeleton className="h-5 w-64" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>
            {/* Centered subtle spinner */}
            <div className="mt-16 flex justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        </div>
    );
}

/**
 * Empty state skeleton for users with no quizzes.
 * Matches the EmptyState component layout.
 */
function EmptyDashboardSkeleton(): React.ReactElement {
    return (
        <div
            className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
            role="status"
            aria-label="Loading dashboard"
        >
            <span className="sr-only">Loading your dashboard...</span>
            {/* Header skeleton */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-9 w-48" />
                    <Skeleton className="h-5 w-64" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>
            {/* Empty state placeholder */}
            <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
                <Skeleton className="h-12 w-12 rounded-full" />
                <Skeleton className="mt-4 h-6 w-40" />
                <Skeleton className="mt-2 h-4 w-64" />
            </div>
        </div>
    );
}

/**
 * Full populated skeleton with StatsBar + QuizGrid.
 * Used when user is authenticated and quizzes are expected.
 */
function PopulatedDashboardSkeleton(): React.ReactElement {
    return (
        <div
            className="mx-auto max-w-7xl min-h-[530dvh] px-4 py-8 sm:min-h-[max(190dvh,1760px)] sm:px-6 lg:px-8"
            role="status"
            aria-label="Loading dashboard"
        >
            <span className="sr-only">Loading your quiz library...</span>
            {/* Header skeleton */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-9 w-48" />
                    <Skeleton className="h-5 w-64" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>

            {/* StatsBar skeleton */}
            <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
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

            {/* DueQuestionsCard placeholder */}
            <div className="mt-8 flex justify-center" aria-hidden="true">
                <Card className="mx-auto w-full max-w-md min-h-[120px]">
                    <CardContent className="flex items-center gap-4 p-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-4 w-48" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* QuizGrid skeleton */}
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 8 }).map((_, i) => (
                    <Card key={i} className="flex h-full flex-col">
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
                ))}
            </div>
        </div>
    );
}
