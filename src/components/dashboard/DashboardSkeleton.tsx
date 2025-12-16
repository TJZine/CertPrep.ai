"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/Card";

/**
 * Skeleton loading state for the Dashboard page.
 * Mimics StatsBar + QuizGrid layout for seamless loading transition.
 */
export function DashboardSkeleton(): React.ReactElement {
    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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

            {/* QuizGrid skeleton */}
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
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

export default DashboardSkeleton;
