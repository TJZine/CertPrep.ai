"use client";

import * as React from "react";
import { Timer, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Question } from "@/types/quiz";

interface TimePerQuestionHeatmapProps {
    timePerQuestion: Record<string, number>;
    questions: Question[];
    className?: string;
}

interface TimeStats {
    averageTime: number;
    slowestQuestions: Array<{ questionId: string; time: number; category: string }>;
    fastestQuestions: Array<{ questionId: string; time: number; category: string }>;
    totalQuestions: number;
}

/**
 * Displays time analytics for questions in the quiz.
 * Shows average time, slowest/fastest questions.
 */
export function TimePerQuestionHeatmap({
    timePerQuestion,
    questions,
    className,
}: TimePerQuestionHeatmapProps): React.ReactElement | null {
    const stats = React.useMemo((): TimeStats | null => {
        const entries = Object.entries(timePerQuestion);
        if (entries.length === 0) return null;

        // Filter out invalid times (NaN, negative, or zero)
        const validTimes = entries
            .map(([id, time]) => ({ id, time }))
            .filter(({ time }) => Number.isFinite(time) && time > 0);

        if (validTimes.length === 0) return null;

        // Calculate average
        const sum = validTimes.reduce((acc, { time }) => acc + time, 0);
        const averageTime = sum / validTimes.length;

        // Build question map for category lookup
        const questionMap = new Map(questions.map((q) => [q.id, q]));

        // Sort by time to find slowest/fastest
        const sorted = [...validTimes].sort((a, b) => b.time - a.time);

        const slowestQuestions = sorted.slice(0, 3).map(({ id, time }) => ({
            questionId: id,
            time,
            category: questionMap.get(id)?.category || "Unknown",
        }));

        const fastestQuestions = sorted
            .slice(-3)
            .reverse()
            .map(({ id, time }) => ({
                questionId: id,
                time,
                category: questionMap.get(id)?.category || "Unknown",
            }));

        return {
            averageTime,
            slowestQuestions,
            fastestQuestions,
            totalQuestions: validTimes.length,
        };
    }, [timePerQuestion, questions]);

    // Precompute id→index map for O(1) lookups (avoids O(n²) findIndex calls)
    const indexMap = React.useMemo(
        () => new Map(questions.map((q, i) => [q.id, i])),
        [questions],
    );

    // Don't render if no time data
    if (!stats) {
        return null;
    }

    const formatSeconds = (seconds: number): string => {
        if (seconds < 60) {
            return `${Math.round(seconds)}s`;
        }
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    };

    return (
        <Card className={className}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Timer className="h-4 w-4" aria-hidden="true" />
                    Time Analysis
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Average time stat */}
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" aria-hidden="true" />
                        Average time per question
                    </span>
                    <span className="text-lg font-semibold text-foreground">
                        {formatSeconds(stats.averageTime)}
                    </span>
                </div>

                {/* Slowest questions */}
                {stats.slowestQuestions.length > 0 && (
                    <div className="space-y-2">
                        <p className="flex items-center gap-1 text-sm font-medium text-foreground">
                            <TrendingDown
                                className="h-4 w-4 text-destructive"
                                aria-hidden="true"
                            />
                            Slowest Questions
                        </p>
                        <div className="space-y-1">
                            {stats.slowestQuestions.map((q, idx) => (
                                <div
                                    key={q.questionId}
                                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                                >
                                    <span className="truncate text-muted-foreground">
                                        Q{(indexMap.get(q.questionId) ?? -1) + 1 || "?"}:{" "}
                                        {q.category}
                                    </span>
                                    <Badge
                                        variant={idx === 0 ? "danger" : "secondary"}
                                        className="ml-2 shrink-0"
                                    >
                                        {formatSeconds(q.time)}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Fastest questions */}
                {stats.fastestQuestions.length > 0 && (
                    <div className="space-y-2">
                        <p className="flex items-center gap-1 text-sm font-medium text-foreground">
                            <TrendingUp
                                className="h-4 w-4 text-success"
                                aria-hidden="true"
                            />
                            Fastest Questions
                        </p>
                        <div className="space-y-1">
                            {stats.fastestQuestions.map((q, idx) => (
                                <div
                                    key={q.questionId}
                                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                                >
                                    <span className="truncate text-muted-foreground">
                                        Q{(indexMap.get(q.questionId) ?? -1) + 1 || "?"}:{" "}
                                        {q.category}
                                    </span>
                                    <Badge
                                        variant={idx === 0 ? "success" : "secondary"}
                                        className="ml-2 shrink-0"
                                    >
                                        {formatSeconds(q.time)}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <p className="text-xs text-muted-foreground">
                    Based on {stats.totalQuestions} question
                    {stats.totalQuestions === 1 ? "" : "s"} with timing data
                </p>
            </CardContent>
        </Card>
    );
}

export default TimePerQuestionHeatmap;
