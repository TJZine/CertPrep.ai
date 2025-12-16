"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, AlertTriangle, History } from "lucide-react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScorecardCompact } from "@/components/results/Scorecard";
import type { Result } from "@/types/result";
import type { Quiz } from "@/types/quiz";
import { EmptyCardState } from "@/components/analytics/EmptyCardState";

interface RecentResultsCardProps {
    results: Result[];
    quizzes?: Quiz[];
    quizTitles?: Map<string, string>;
    /** Maximum number of results to show initially before "View All" */
    initialLimit?: number;
    className?: string;
}

/**
 * Displays a list of recent quiz results with navigation to result details.
 * Shows warning icons for quizzes missing category metadata.
 */
export function RecentResultsCard({
    results,
    quizzes = [],
    quizTitles,
    initialLimit = 5,
    className,
}: RecentResultsCardProps): React.ReactElement {
    const router = useRouter();
    const [showAllResults, setShowAllResults] = React.useState(false);

    // Sort by most recent first
    const sortedResults = React.useMemo(
        () => [...results].sort((a, b) => b.timestamp - a.timestamp),
        [results],
    );

    // Map for quick quiz lookup to check category metadata
    const quizMap = React.useMemo(
        () => new Map(quizzes.map((q) => [q.id, q])),
        [quizzes],
    );

    if (results.length === 0) {
        return (
            <EmptyCardState
                className={className}
                headerIcon={<History className="h-5 w-5" aria-hidden="true" />}
                icon={<History aria-hidden="true" />}
                title="Recent Results"
                description="Complete some quizzes to see your recent results."
            />
        );
    }

    const displayedResults = showAllResults
        ? sortedResults
        : sortedResults.slice(0, initialLimit);

    return (
        <Card className={className}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <History className="h-5 w-5" aria-hidden="true" />
                    Recent Results
                </CardTitle>
                <CardDescription>
                    Your latest quiz attempts
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {displayedResults.map((result) => {
                        const quiz = quizMap.get(result.quiz_id);
                        const isMissingCategory = quiz && !quiz.category;
                        const quizTitle = quizTitles?.get(result.quiz_id) || "Unknown Quiz";

                        return (
                            <div key={result.id} className="relative">
                                <ScorecardCompact
                                    title={quizTitle}
                                    score={result.score}
                                    mode={result.mode}
                                    timestamp={result.timestamp}
                                    timeTakenSeconds={result.time_taken_seconds}
                                    onClick={() => router.push(`/results/${result.id}`)}
                                />
                                {isMissingCategory && (
                                    <span
                                        className="group/warning absolute right-2 top-2 z-10"
                                        role="img"
                                        aria-label="Warning: Quiz missing category for analytics"
                                    >
                                        <AlertTriangle
                                            className="h-4 w-4 text-warning cursor-help"
                                            aria-hidden="true"
                                        />
                                        <span
                                            className="pointer-events-none absolute right-0 top-6 w-48 rounded-lg bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg opacity-0 transition-opacity group-hover/warning:opacity-100 border border-border z-20"
                                            role="tooltip"
                                        >
                                            <strong className="block mb-1">Missing Category</strong>
                                            <span className="text-muted-foreground">
                                                This quiz won&apos;t appear in grouped analytics. Fix via:
                                            </span>
                                            <ul className="mt-1 list-disc pl-3 text-muted-foreground">
                                                <li>Dashboard → Quiz menu → Edit Settings</li>
                                                <li>Result page → Add Category button</li>
                                            </ul>
                                        </span>
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>

                {sortedResults.length > initialLimit && !showAllResults && (
                    <Button
                        variant="ghost"
                        className="mt-4 w-full"
                        rightIcon={
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        }
                        onClick={() => setShowAllResults(true)}
                    >
                        View All {sortedResults.length} Results
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

export default RecentResultsCard;
