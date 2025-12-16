"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, History, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn, formatDate, formatTime } from "@/lib/utils";
import type { Result } from "@/types/result";

interface AttemptHistoryTimelineProps {
    currentResultId: string;
    allResults: Result[];
    className?: string;
}

interface AttemptItemProps {
    result: Result;
    previousScore?: number;
    isCurrent: boolean;
    onClick: () => void;
}

function TrendIcon({ current, previous }: { current: number; previous?: number }): React.ReactElement | null {
    if (previous === undefined) return null;

    const diff = current - previous;
    if (diff > 0) return <TrendingUp className="h-3 w-3 text-success" aria-hidden="true" />;
    if (diff < 0) return <TrendingDown className="h-3 w-3 text-destructive" aria-hidden="true" />;
    return <Minus className="h-3 w-3 text-muted-foreground" aria-hidden="true" />;
}

function AttemptItem({ result, previousScore, isCurrent, onClick }: AttemptItemProps): React.ReactElement {
    const scoreColor = result.score >= 70 ? "text-success" : result.score >= 60 ? "text-warning" : "text-destructive";

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={isCurrent}
            className={cn(
                "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                isCurrent
                    ? "border-primary bg-primary/5 cursor-default"
                    : "border-border hover:bg-accent cursor-pointer"
            )}
            aria-current={isCurrent ? "page" : undefined}
        >
            <div className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-secondary", scoreColor)}>
                <span className="text-sm font-bold">{result.score}%</span>
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                        {formatDate(result.timestamp)}
                    </span>
                    {isCurrent && (
                        <Badge variant="default" className="text-xs">Current</Badge>
                    )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatTime(result.time_taken_seconds)}</span>
                    <span>•</span>
                    <span className="capitalize">{result.mode}</span>
                </div>
            </div>

            <div className="flex items-center gap-1">
                <TrendIcon current={result.score} previous={previousScore} />
            </div>
        </button>
    );
}

/**
 * Collapsible timeline showing all attempts for the current quiz.
 * Highlights the current result and shows score trends.
 */
export function AttemptHistoryTimeline({
    currentResultId,
    allResults,
    className,
}: AttemptHistoryTimelineProps): React.ReactElement | null {
    const router = useRouter();
    const [isExpanded, setIsExpanded] = React.useState(false);

    // Sort results by timestamp (newest first)
    const sortedResults = React.useMemo(() => {
        return [...allResults]
            .filter((r) => !r.deleted_at) // Exclude soft-deleted
            .sort((a, b) => b.timestamp - a.timestamp);
    }, [allResults]);

    // Only show if there are multiple attempts
    if (sortedResults.length < 2) {
        return null;
    }

    const displayedResults = isExpanded ? sortedResults : sortedResults.slice(0, 3);
    const hasMoreResults = sortedResults.length > 3;

    const handleNavigate = (resultId: string): void => {
        if (resultId !== currentResultId) {
            router.push(`/results/${resultId}`);
        }
    };

    return (
        <Card className={className}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <History className="h-4 w-4" aria-hidden="true" />
                    Attempt History
                    <Badge variant="secondary" className="ml-auto text-xs">
                        {sortedResults.length} attempts
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {displayedResults.map((result) => {
                    // Find previous score (the next item in sorted array, since newest is first)
                    const previousResult = sortedResults[sortedResults.indexOf(result) + 1];
                    return (
                        <AttemptItem
                            key={result.id}
                            result={result}
                            previousScore={previousResult?.score}
                            isCurrent={result.id === currentResultId}
                            onClick={() => handleNavigate(result.id)}
                        />
                    );
                })}

                {hasMoreResults && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-full"
                    >
                        {isExpanded ? (
                            <>
                                <ChevronUp className="mr-2 h-4 w-4" aria-hidden="true" />
                                Show less
                            </>
                        ) : (
                            <>
                                <ChevronDown className="mr-2 h-4 w-4" aria-hidden="true" />
                                Show all {sortedResults.length} attempts
                            </>
                        )}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

export default AttemptHistoryTimeline;
