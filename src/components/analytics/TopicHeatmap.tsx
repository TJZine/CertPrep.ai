"use client";

import * as React from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/Card";
import { formatDateKey, formatMonthDayLabel } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { Result } from "@/types/result";
import type { Quiz } from "@/types/quiz";
import { hashAnswer } from "@/lib/utils";

interface TopicHeatmapProps {
    results: Result[];
    quizzes: Quiz[];
    className?: string;
}

interface WeekData {
    weekKey: string;
    weekLabel: string;
    startDate: Date;
    endDate: Date;
}

interface CategoryWeekScore {
    category: string;
    weeks: Array<{ weekKey: string; weekLabel: string; score: number | null; correct: number; total: number }>;
}

/**
 * Get the last N weeks (including current week).
 */
function getLastNWeeks(n: number): WeekData[] {
    const weeks: WeekData[] = [];
    const now = new Date();
    const currentDay = now.getDay();

    // Find the start of the current week (Sunday)
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - currentDay);
    currentWeekStart.setHours(0, 0, 0, 0);

    for (let i = n - 1; i >= 0; i--) {
        const startDate = new Date(currentWeekStart);
        startDate.setDate(currentWeekStart.getDate() - i * 7);

        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);

        const weekKey = formatDateKey(startDate);
        const weekLabel = formatMonthDayLabel(startDate);

        weeks.push({ weekKey, weekLabel, startDate, endDate });
    }

    return weeks;
}

/**
 * Get mastery color based on score.
 */
function getMasteryColor(score: number | null): string {
    if (score === null) return "bg-muted";
    if (score >= 90) return "bg-success";
    if (score >= 70) return "bg-success/60";
    if (score >= 50) return "bg-warning";
    return "bg-destructive/70";
}

/**
 * Topic Heatmap showing category performance over time.
 * Rows = categories, Columns = weeks.
 */
export function TopicHeatmap({
    results,
    quizzes,
    className,
}: TopicHeatmapProps): React.ReactElement {
    const [heatmapData, setHeatmapData] = React.useState<CategoryWeekScore[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    const weeks = React.useMemo(() => getLastNWeeks(4), []);
    const quizMap = React.useMemo(
        () => new Map(quizzes.map((q) => [q.id, q])),
        [quizzes],
    );

    React.useEffect(() => {
        let isMounted = true;

        const calculateHeatmap = async (): Promise<void> => {
            if (results.length === 0 || quizzes.length === 0) {
                setHeatmapData([]);
                setIsLoading(false);
                return;
            }

            // Category -> Week -> { correct, total }
            const categoryWeekData = new Map<
                string,
                Map<string, { correct: number; total: number }>
            >();

            // Process all results
            for (const result of results) {
                const quiz = quizMap.get(result.quiz_id);
                if (!quiz) continue;

                const resultDate = new Date(result.timestamp);

                // Find which week this result belongs to
                const weekIndex = weeks.findIndex(
                    (w) => resultDate >= w.startDate && resultDate <= w.endDate,
                );
                if (weekIndex === -1) continue;

                const { weekKey } = weeks[weekIndex]!;

                // Filter to questions served in this session
                const idSet = result.question_ids
                    ? new Set(result.question_ids)
                    : null;
                const sessionQuestions = idSet
                    ? quiz.questions.filter((q) => idSet.has(q.id))
                    : quiz.questions;

                // Process each question
                for (const question of sessionQuestions) {
                    const category = question.category || "Uncategorized";
                    const userAnswer = result.answers[question.id];

                    let isCorrect = false;
                    if (userAnswer) {
                        const userHash = await hashAnswer(userAnswer);
                        if (userHash === question.correct_answer_hash) {
                            isCorrect = true;
                        }
                    }

                    // Initialize category if not exists
                    if (!categoryWeekData.has(category)) {
                        categoryWeekData.set(category, new Map());
                    }
                    const weekMap = categoryWeekData.get(category)!;

                    // Initialize week if not exists
                    if (!weekMap.has(weekKey)) {
                        weekMap.set(weekKey, { correct: 0, total: 0 });
                    }

                    const weekStats = weekMap.get(weekKey)!;
                    weekStats.total += 1;
                    if (isCorrect) {
                        weekStats.correct += 1;
                    }
                }
            }

            // Convert to array format
            const data: CategoryWeekScore[] = Array.from(
                categoryWeekData.entries(),
            ).map(([category, weekMap]) => ({
                category,
                weeks: weeks.map((w) => {
                    const stats = weekMap.get(w.weekKey);
                    return {
                        weekKey: w.weekKey,
                        weekLabel: w.weekLabel,
                        score:
                            stats && stats.total > 0
                                ? Math.round((stats.correct / stats.total) * 100)
                                : null,
                        correct: stats?.correct ?? 0,
                        total: stats?.total ?? 0,
                    };
                }),
            }));

            // Sort by average score (lowest first to highlight weak areas)
            data.sort((a, b) => {
                const aAvg =
                    a.weeks.filter((w) => w.score !== null).reduce((sum, w) => sum + (w.score ?? 0), 0) /
                    Math.max(a.weeks.filter((w) => w.score !== null).length, 1);
                const bAvg =
                    b.weeks.filter((w) => w.score !== null).reduce((sum, w) => sum + (w.score ?? 0), 0) /
                    Math.max(b.weeks.filter((w) => w.score !== null).length, 1);
                return aAvg - bAvg;
            });

            if (isMounted) {
                setHeatmapData(data);
                setIsLoading(false);
            }
        };

        calculateHeatmap();

        return (): void => {
            isMounted = false;
        };
    }, [results, quizzes, weeks, quizMap]);

    if (isLoading) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle>Topic Mastery Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex h-32 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (heatmapData.length === 0) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle>Topic Mastery Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-muted-foreground">
                        Complete some quizzes to see your topic mastery over time.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle>Topic Mastery Over Time</CardTitle>
                <CardDescription>
                    Track how your performance in each topic has changed over the last 4 weeks
                </CardDescription>
            </CardHeader>
            <CardContent>
                {/* Header row with week labels */}
                <div className="mb-2 grid gap-2" style={{ gridTemplateColumns: "1fr repeat(4, 60px)" }}>
                    <div /> {/* Empty cell for category column */}
                    {weeks.map((w) => (
                        <div
                            key={w.weekKey}
                            className="text-center text-xs font-medium text-muted-foreground"
                        >
                            {w.weekLabel}
                        </div>
                    ))}
                </div>

                {/* Category rows */}
                <div className="space-y-2">
                    {heatmapData.map((catData) => (
                        <div
                            key={catData.category}
                            className="grid items-center gap-2"
                            style={{ gridTemplateColumns: "1fr repeat(4, 60px)" }}
                        >
                            <div
                                className="truncate text-sm font-medium text-foreground"
                                title={catData.category}
                            >
                                {catData.category}
                            </div>
                            {catData.weeks.map((weekData) => (
                                <div
                                    key={weekData.weekKey}
                                    className={cn(
                                        "flex h-8 items-center justify-center rounded-md text-xs font-medium transition-colors",
                                        getMasteryColor(weekData.score),
                                        weekData.score !== null && weekData.score >= 70
                                            ? "text-white"
                                            : "text-foreground",
                                    )}
                                    title={`${catData.category} - ${weekData.weekLabel}: ${weekData.score !== null ? `${weekData.score}% (${weekData.correct}/${weekData.total})` : "No data"}`}
                                >
                                    {weekData.score !== null ? `${weekData.score}%` : "—"}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                {/* Legend */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-4 border-t border-border pt-4">
                    <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-sm bg-success" />
                        <span className="text-xs text-muted-foreground">90%+ Mastered</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-sm bg-success/60" />
                        <span className="text-xs text-muted-foreground">70-89% Competent</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-sm bg-warning" />
                        <span className="text-xs text-muted-foreground">50-69% Needs work</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-sm bg-destructive/70" />
                        <span className="text-xs text-muted-foreground">&lt;50% Struggling</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-sm bg-muted" />
                        <span className="text-xs text-muted-foreground">No data</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default TopicHeatmap;
