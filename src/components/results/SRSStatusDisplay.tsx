"use client";

import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Calendar, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { db } from "@/db";
import { cn } from "@/lib/utils";
import type { SRSState, LeitnerBox } from "@/types/srs";

interface SRSStatusDisplayProps {
    questionIds: string[];
    userId: string;
    quizId: string;
    className?: string;
}

interface BoxCounts {
    box: LeitnerBox;
    count: number;
    label: string;
    color: string;
}

/**
 * Displays SRS status for questions in the current quiz.
 * Shows how many questions are in each Leitner box and due for review.
 */
export function SRSStatusDisplay({
    questionIds,
    userId,
    quizId,
    className,
}: SRSStatusDisplayProps): React.ReactElement | null {
    // Live query for SRS states of questions in this quiz
    const srsStates = useLiveQuery(
        async (): Promise<SRSState[]> => {
            if (!userId || questionIds.length === 0) return [];

            const states = await db.srs
                .where("user_id")
                .equals(userId)
                .toArray();

            // Filter to only questions in this quiz
            const questionIdSet = new Set(questionIds);
            return states.filter((s) => questionIdSet.has(s.question_id));
        },
        [userId, questionIds],
        []
    );

    // Get current time outside useMemo to avoid impure function inside memo
    const [currentTime, setCurrentTime] = React.useState(() => Date.now());

    // Update time periodically to refresh due count
    React.useEffect((): (() => void) => {
        const interval = setInterval((): void => {
            setCurrentTime(Date.now());
        }, 60000); // Update every minute
        return (): void => clearInterval(interval);
    }, []);

    const stats = React.useMemo(() => {
        if (!srsStates || srsStates.length === 0) return null;

        const dueCount = srsStates.filter((s) => s.next_review <= currentTime).length;

        const boxCounts: BoxCounts[] = [
            { box: 1, count: 0, label: "Learning", color: "bg-destructive" },
            { box: 2, count: 0, label: "Review", color: "bg-warning" },
            { box: 3, count: 0, label: "Familiar", color: "bg-tier-passing" },
            { box: 4, count: 0, label: "Known", color: "bg-tier-good" },
            { box: 5, count: 0, label: "Mastered", color: "bg-success" },
        ];

        srsStates.forEach((state) => {
            const boxIndex = state.box - 1;
            if (boxIndex >= 0 && boxIndex < boxCounts.length) {
                const boxCount = boxCounts[boxIndex];
                if (boxCount) {
                    boxCount.count++;
                }
            }
        });

        // Find next review date
        const nextReview = srsStates
            .map((s) => s.next_review)
            .filter((r) => r > currentTime)
            .sort((a, b) => a - b)[0];

        return {
            totalTracked: srsStates.length,
            dueCount,
            boxCounts: boxCounts.filter((b) => b.count > 0),
            nextReview,
        };
    }, [srsStates, currentTime]);

    // Don't render if no SRS data exists for these questions
    if (!stats || stats.totalTracked === 0) {
        return null;
    }

    const formatNextReview = (timestamp: number): string => {
        const diff = timestamp - currentTime;

        if (diff <= 0) return "Now";

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d`;
        if (hours > 0) return `${hours}h`;
        return "Soon";
    };

    return (
        <Card className={className}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    Spaced Repetition Status
                    {stats.dueCount > 0 && (
                        <Badge variant="warning" className="ml-auto">
                            {stats.dueCount} due
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {/* Box distribution */}
                    <div className="flex items-center gap-1">
                        {stats.boxCounts.map((box) => (
                            <div
                                key={box.box}
                                className="flex flex-1 flex-col items-center rounded-lg border border-border p-2"
                            >
                                <div className={cn("mb-1 h-2 w-2 rounded-full", box.color)} />
                                <span className="text-lg font-semibold text-foreground">
                                    {box.count}
                                </span>
                                <span className="text-xs text-muted-foreground">{box.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Summary row */}
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                        <span className="text-muted-foreground">
                            {stats.totalTracked} of {questionIds.length} questions tracked
                        </span>
                        {stats.nextReview && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                                <Calendar className="h-3 w-3" aria-hidden="true" />
                                Next: {formatNextReview(stats.nextReview)}
                            </span>
                        )}
                    </div>

                    {/* Link to SRS review if questions are due */}
                    {stats.dueCount > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                                window.location.href = `/quiz/${quizId}/zen?mode=srs`;
                            }}
                        >
                            Review Due Questions
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export default SRSStatusDisplay;
