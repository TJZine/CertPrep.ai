"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

/**
 * Skeleton loading state for the Quiz Lobby page (/quiz/[id]).
 * Matches the layout of title, tags, stats grid (optional), and mode cards.
 */
export function QuizLobbySkeleton(): React.ReactElement {
    return (
        <div
            className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8"
            role="status"
            aria-label="Loading quiz details"
        >
            <span className="sr-only">Loading quiz details...</span>

            {/* Back button skeleton */}
            <Skeleton className="mb-4 h-8 w-32" aria-hidden="true" />

            {/* Header Section */}
            <div className="mb-8" aria-hidden="true">
                <Skeleton className="h-9 w-3/4 max-w-md" />
                <Skeleton className="mt-2 h-6 w-1/2 max-w-sm" />
                {/* Tags */}
                <div className="mt-4 flex flex-wrap gap-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                </div>
            </div>

            {/* Stats Grid skeleton (shown for returning users) */}
            <div className="mb-8 grid gap-4 sm:grid-cols-3" aria-hidden="true">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i}>
                        <CardContent className="flex items-center gap-4 p-6">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-7 w-12" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Mode Selection Cards */}
            <div className="grid gap-6 md:grid-cols-2" aria-hidden="true">
                {/* Zen Mode Card */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-6 w-6 rounded" />
                            <Skeleton className="h-7 w-28" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="mb-6 h-12 w-full" />
                        <div className="mb-8 space-y-2">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-4 w-44" />
                            <Skeleton className="h-4 w-36" />
                        </div>
                        <Skeleton className="h-12 w-full rounded-lg" />
                    </CardContent>
                </Card>

                {/* Proctor Mode Card */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-6 w-6 rounded" />
                            <Skeleton className="h-7 w-32" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="mb-6 h-12 w-full" />
                        <div className="mb-8 space-y-2">
                            <Skeleton className="h-4 w-36" />
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                        <Skeleton className="h-12 w-full rounded-lg" />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
