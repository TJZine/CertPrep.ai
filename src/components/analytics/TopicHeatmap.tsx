"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatDateKey, formatMonthDayLabel } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { Result } from "@/types/result";
import type { Quiz, Question } from "@/types/quiz";
import { getCachedHash } from "@/db/hashCache";
import { ChevronDown, BookOpen, TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { getTopicStudyQuestions } from "@/db/results";
import {
    TOPIC_STUDY_QUESTIONS_KEY,
    TOPIC_STUDY_CATEGORY_KEY,
    TOPIC_STUDY_MISSED_COUNT_KEY,
    TOPIC_STUDY_FLAGGED_COUNT_KEY,
} from "@/lib/topicStudyStorage";
import { logger } from "@/lib/logger";

interface TopicHeatmapProps {
    results: Result[];
    quizzes: Quiz[];
    userId?: string;
    className?: string;
}

type SortMode = "worst-first" | "best-first" | "alphabetical";

interface TimeColumn {
    key: string;
    label: string;
    shortLabel: string;
    startDate: Date;
    endDate: Date;
    type: "week" | "day";
}

interface CategoryData {
    category: string;
    columns: Array<{
        key: string;
        label: string;
        score: number | null;
        correct: number;
        total: number;
        trend: "up" | "down" | "stable" | null;
    }>;
    averageScore: number;
}

/**
 * Get time columns: 1 week (days 8-14 ago) + 7 individual days (last 7 days).
 */
function getTimeColumns(): TimeColumn[] {
    const columns: TimeColumn[] = [];
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    // Previous week: days 8-14 ago
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() - 7);
    weekEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 13);
    weekStart.setHours(0, 0, 0, 0);

    columns.push({
        key: "prev-week",
        label: "Prev Week",
        shortLabel: "Prev",
        startDate: weekStart,
        endDate: weekEnd,
        type: "week",
    });

    // Last 7 days (oldest first, so day 6 ago -> today)
    for (let i = 6; i >= 0; i--) {
        const dayDate = new Date(now);
        dayDate.setDate(now.getDate() - i);
        dayDate.setHours(0, 0, 0, 0);

        const dayEnd = new Date(dayDate);
        dayEnd.setHours(23, 59, 59, 999);

        const dayLabel = i === 0
            ? "Today"
            : i === 1
                ? "Yesterday"
                : formatMonthDayLabel(dayDate);

        const shortLabel = i === 0
            ? "Today"
            : i === 1
                ? "Yest"
                : formatMonthDayLabel(dayDate);

        columns.push({
            key: formatDateKey(dayDate),
            label: dayLabel,
            shortLabel,
            startDate: dayDate,
            endDate: dayEnd,
            type: "day",
        });
    }

    return columns;
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
 * Get trend indicator symbol.
 */
function getTrendIndicator(trend: "up" | "down" | "stable" | null): string {
    if (trend === "up") return "↑";
    if (trend === "down") return "↓";
    if (trend === "stable") return "→";
    return "";
}

/**
 * Get trend color class.
 */
function getTrendColor(trend: "up" | "down" | "stable" | null): string {
    if (trend === "up") return "text-success";
    if (trend === "down") return "text-destructive";
    return "";
}

/**
 * Skeleton loader matching the heatmap layout.
 */
function HeatmapSkeleton({ className }: { className?: string }): React.ReactElement {
    return (
        <Card className={className}>
            <CardHeader>
                <div className="h-6 w-48 animate-pulse rounded bg-muted" />
                <div className="mt-1 h-4 w-72 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent>
                {/* Header row skeleton */}
                <div
                    className="mb-2 grid gap-1 overflow-x-auto"
                    style={{ gridTemplateColumns: "minmax(120px, 1fr) repeat(8, minmax(40px, 50px))" }}
                >
                    <div />
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-4 animate-pulse rounded bg-muted" />
                    ))}
                </div>
                {/* Data rows skeleton */}
                <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                        <div
                            key={i}
                            className="grid items-center gap-1"
                            style={{ gridTemplateColumns: "minmax(120px, 1fr) repeat(8, minmax(40px, 50px))" }}
                        >
                            <div className="h-6 w-24 animate-pulse rounded bg-muted" />
                            {[...Array(8)].map((_, j) => (
                                <div key={j} className="h-8 animate-pulse rounded bg-muted" />
                            ))}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * Topic Heatmap showing category performance over time.
 * Displays: Prev Week (days 8-14 ago) + Last 7 days individually.
 */
export function TopicHeatmap({
    results,
    quizzes,
    userId,
    className,
}: TopicHeatmapProps): React.ReactElement {
    const router = useRouter();
    const { addToast } = useToast();
    const [heatmapData, setHeatmapData] = React.useState<CategoryData[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [sortMode, setSortMode] = React.useState<SortMode>("worst-first");
    const [showSortMenu, setShowSortMenu] = React.useState(false);
    const [loadingCategory, setLoadingCategory] = React.useState<string | null>(null);

    const timeColumns = React.useMemo(() => getTimeColumns(), []);
    const quizMap = React.useMemo(
        () => new Map(quizzes.map((q) => [q.id, q])),
        [quizzes],
    );

    const allQuestionsMap = React.useMemo(() => {
        const map = new Map<string, { question: Question; quizId: string }>();
        quizzes.forEach((q) => {
            q.questions.forEach((question) => {
                map.set(question.id, { question, quizId: q.id });
            });
        });
        return map;
    }, [quizzes]);

    React.useEffect(() => {
        let isMounted = true;

        const calculateHeatmap = async (): Promise<void> => {
            if (results.length === 0 || quizzes.length === 0) {
                setHeatmapData([]);
                setIsLoading(false);
                return;
            }

            // Category -> Column Key -> { correct, total }
            const categoryColumnData = new Map<
                string,
                Map<string, { correct: number; total: number }>
            >();

            // Uses persistent IndexedDB cache for answer hashes (survives page reloads)

            // Process all results
            for (const result of results) {
                let sessionQuestions: Question[] = [];
                const quiz = quizMap.get(result.quiz_id);

                // Case 1: Standard Quiz
                if (quiz && quiz.questions.length > 0) {
                    const idSet = result.question_ids
                        ? new Set(result.question_ids)
                        : null;
                    sessionQuestions = idSet
                        ? quiz.questions.filter((q) => idSet.has(q.id))
                        : quiz.questions;
                }
                // Case 2: Aggregated Result (SRS/Topic Study)
                else if (result.question_ids && result.question_ids.length > 0) {
                    sessionQuestions = result.question_ids
                        .map(id => allQuestionsMap.get(id)?.question)
                        .filter((q): q is Question => !!q);
                }

                if (sessionQuestions.length === 0) continue;

                const resultDate = new Date(result.timestamp);

                // Find which column this result belongs to
                const columnIndex = timeColumns.findIndex(
                    (col) => resultDate >= col.startDate && resultDate <= col.endDate,
                );
                if (columnIndex === -1) continue;

                const { key: columnKey } = timeColumns[columnIndex]!;

                // Process each question
                for (const question of sessionQuestions) {
                    const category = question.category || "Uncategorized";
                    const userAnswer = result.answers[question.id];

                    let isCorrect = false;
                    if (userAnswer) {
                        const userHash = await getCachedHash(userAnswer);
                        if (userHash === question.correct_answer_hash) {
                            isCorrect = true;
                        }
                    }

                    // Initialize category if not exists
                    if (!categoryColumnData.has(category)) {
                        categoryColumnData.set(category, new Map());
                    }
                    const columnMap = categoryColumnData.get(category)!;

                    // Initialize column if not exists
                    if (!columnMap.has(columnKey)) {
                        columnMap.set(columnKey, { correct: 0, total: 0 });
                    }

                    const columnStats = columnMap.get(columnKey)!;
                    columnStats.total += 1;
                    if (isCorrect) {
                        columnStats.correct += 1;
                    }
                }
            }

            // Convert to array format with trends
            const data: CategoryData[] = Array.from(
                categoryColumnData.entries(),
            ).map(([category, columnMap]) => {
                const columns = timeColumns.map((col, index) => {
                    const stats = columnMap.get(col.key);
                    const score =
                        stats && stats.total > 0
                            ? Math.round((stats.correct / stats.total) * 100)
                            : null;

                    // Calculate trend (compare to previous column)
                    let trend: "up" | "down" | "stable" | null = null;
                    if (index > 0 && score !== null) {
                        const prevStats = columnMap.get(timeColumns[index - 1]!.key);
                        const prevScore =
                            prevStats && prevStats.total > 0
                                ? Math.round((prevStats.correct / prevStats.total) * 100)
                                : null;

                        if (prevScore !== null) {
                            const diff = score - prevScore;
                            if (diff > 5) trend = "up";
                            else if (diff < -5) trend = "down";
                            else trend = "stable";
                        }
                    }

                    return {
                        key: col.key,
                        label: col.label,
                        score,
                        correct: stats?.correct ?? 0,
                        total: stats?.total ?? 0,
                        trend,
                    };
                });

                // Calculate average score for sorting
                const validScores = columns.filter((c) => c.score !== null);
                const averageScore =
                    validScores.length > 0
                        ? validScores.reduce((sum, c) => sum + (c.score ?? 0), 0) / validScores.length
                        : 0;

                return { category, columns, averageScore };
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
    }, [results, quizzes, timeColumns, quizMap, allQuestionsMap]);

    // Sort data based on current mode
    const sortedData = React.useMemo(() => {
        const sorted = [...heatmapData];
        switch (sortMode) {
            case "alphabetical":
                return sorted.sort((a, b) => a.category.localeCompare(b.category));
            case "best-first":
                return sorted.sort((a, b) => b.averageScore - a.averageScore);
            default: // worst-first
                return sorted.sort((a, b) => a.averageScore - b.averageScore);
        }
    }, [heatmapData, sortMode]);

    // Calculate weekly summary (compare daily avg to prev week)
    const weeklySummary = React.useMemo(() => {
        if (heatmapData.length === 0) return null;

        let prevWeekTotal = 0;
        let prevWeekCount = 0;
        let thisWeekTotal = 0;
        let thisWeekCount = 0;

        for (const cat of heatmapData) {
            // Prev week is index 0
            const prevWeekCol = cat.columns[0];
            if (prevWeekCol?.score !== null && prevWeekCol?.score !== undefined) {
                prevWeekTotal += prevWeekCol.score;
                prevWeekCount++;
            }
            // Daily columns are indices 1-7
            for (let i = 1; i < cat.columns.length; i++) {
                const col = cat.columns[i];
                if (col?.score !== null && col?.score !== undefined) {
                    thisWeekTotal += col.score;
                    thisWeekCount++;
                }
            }
        }

        if (prevWeekCount === 0 || thisWeekCount === 0) return null;

        const prevWeekAvg = prevWeekTotal / prevWeekCount;
        const thisWeekAvg = thisWeekTotal / thisWeekCount;
        const change = Math.round(thisWeekAvg - prevWeekAvg);

        return { change, thisWeekAvg: Math.round(thisWeekAvg) };
    }, [heatmapData]);

    // Handle "Focus Here" button click
    const handleFocusCategory = async (category: string): Promise<void> => {
        if (!userId) {
            logger.warn("Cannot focus category: no userId provided");
            return;
        }

        setLoadingCategory(category);

        try {
            const data = await getTopicStudyQuestions(userId, category);

            if (data.totalUniqueCount === 0) {
                addToast("info", `No active questions found to study for ${category}`);
                setLoadingCategory(null);
                return;
            }

            // Store in sessionStorage for topic-review page
            sessionStorage.setItem(
                TOPIC_STUDY_QUESTIONS_KEY,
                JSON.stringify(data.questionIds),
            );
            sessionStorage.setItem(TOPIC_STUDY_CATEGORY_KEY, category);
            sessionStorage.setItem(
                TOPIC_STUDY_MISSED_COUNT_KEY,
                String(data.missedCount),
            );
            sessionStorage.setItem(
                TOPIC_STUDY_FLAGGED_COUNT_KEY,
                String(data.flaggedCount),
            );

            router.push("/quiz/topic-review");
        } catch (error) {
            logger.error("Failed to load topic study questions", error);
            addToast("error", "Failed to prepare study session");
            setLoadingCategory(null);
        }
    };

    const sortLabels: Record<SortMode, string> = {
        "worst-first": "Weakest First",
        "best-first": "Strongest First",
        "alphabetical": "A-Z",
    };

    if (isLoading) {
        return <HeatmapSkeleton className={className} />;
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
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div className="flex-1">
                    <CardTitle>Topic Mastery Over Time</CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-2">
                        <span>Previous week summary + daily breakdown</span>
                        {/* Weekly Summary Stat */}
                        {weeklySummary && (
                            <span
                                className={cn(
                                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                                    weeklySummary.change > 0 && "bg-success/10 text-success",
                                    weeklySummary.change < 0 && "bg-destructive/10 text-destructive",
                                    weeklySummary.change === 0 && "bg-muted text-muted-foreground",
                                )}
                            >
                                {weeklySummary.change > 0 && <TrendingUp className="h-3 w-3" aria-hidden="true" />}
                                {weeklySummary.change < 0 && <TrendingDown className="h-3 w-3" aria-hidden="true" />}
                                {weeklySummary.change === 0 && <Minus className="h-3 w-3" aria-hidden="true" />}
                                {weeklySummary.change > 0 ? "+" : ""}{weeklySummary.change}% this week
                            </span>
                        )}
                    </CardDescription>
                </div>
                {/* Sort toggle */}
                <div className="relative">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSortMenu(!showSortMenu)}
                        className="text-xs"
                        aria-label="Change sort order"
                        aria-expanded={showSortMenu}
                    >
                        {sortLabels[sortMode]}
                        <ChevronDown className="ml-1 h-3 w-3" aria-hidden="true" />
                    </Button>
                    {showSortMenu && (
                        <div
                            className="absolute right-0 top-full z-10 mt-1 rounded-md border border-border bg-card shadow-lg"
                            role="menu"
                        >
                            {(Object.keys(sortLabels) as SortMode[]).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => {
                                        setSortMode(mode);
                                        setShowSortMenu(false);
                                    }}
                                    className={cn(
                                        "block w-full px-3 py-1.5 text-left text-xs hover:bg-muted",
                                        sortMode === mode && "bg-muted font-medium",
                                    )}
                                    role="menuitem"
                                >
                                    {sortLabels[mode]}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {/* Scrollable container for mobile */}
                <div className="-mx-2 overflow-x-auto px-2 pb-2" style={{ WebkitOverflowScrolling: "touch" }}>
                    {/* Header row with column labels */}
                    <div
                        className="mb-2 grid min-w-[600px] gap-1"
                        style={{ gridTemplateColumns: "minmax(140px, 1fr) repeat(8, minmax(44px, 52px))" }}
                    >
                        <div className="text-xs font-medium text-muted-foreground">Category</div>
                        {timeColumns.map((col) => (
                            <div
                                key={col.key}
                                className="text-center text-xs font-medium text-muted-foreground"
                                title={col.label}
                            >
                                {col.shortLabel}
                            </div>
                        ))}
                    </div>

                    {/* Category rows */}
                    <div className="min-w-[600px] space-y-1" role="grid" aria-label="Topic mastery heatmap">
                        {sortedData.map((catData) => (
                            <div
                                key={catData.category}
                                className="grid items-center gap-1"
                                style={{ gridTemplateColumns: "minmax(140px, 1fr) repeat(8, minmax(44px, 52px))" }}
                                role="row"
                            >
                                <div
                                    className="flex items-center gap-1"
                                    role="rowheader"
                                >
                                    <span
                                        className="truncate text-sm font-medium text-foreground"
                                        title={catData.category}
                                    >
                                        {catData.category}
                                    </span>
                                    {/* Focus Here button */}
                                    {userId && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 w-5 flex-shrink-0 p-0"
                                            onClick={() => handleFocusCategory(catData.category)}
                                            disabled={loadingCategory !== null}
                                            title={`Study ${catData.category}`}
                                            aria-label={`Study ${catData.category}`}
                                        >
                                            {loadingCategory === catData.category ? (
                                                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                                            ) : (
                                                <BookOpen className="h-3 w-3 text-muted-foreground hover:text-primary" aria-hidden="true" />
                                            )}
                                        </Button>
                                    )}
                                </div>
                                {catData.columns.map((colData) => (
                                    <div
                                        key={colData.key}
                                        role="gridcell"
                                        className={cn(
                                            "flex h-8 items-center justify-center rounded-md text-xs transition-colors",
                                            getMasteryColor(colData.score),
                                            // Volume indicator: dim low-sample cells
                                            colData.total > 0 && colData.total < 3 && "opacity-50",
                                            colData.total >= 3 && colData.total < 5 && "opacity-75",
                                            // Heatmap intensity: bold high-sample cells
                                            colData.total >= 10 && "font-bold ring-1 ring-current/20",
                                            colData.total >= 5 && colData.total < 10 && "font-semibold",
                                            colData.total > 0 && colData.total < 5 && "font-normal",
                                            // Text color
                                            colData.score !== null && colData.score >= 70
                                                ? "text-white"
                                                : "text-foreground",
                                        )}
                                        title={`${catData.category} - ${colData.label}: ${colData.score !== null ? `${colData.score}% (${colData.correct}/${colData.total})` : "No data"}${colData.total > 0 && colData.total < 5 ? " (low sample)" : ""}${colData.total >= 10 ? " (high confidence)" : ""}`}
                                        aria-label={`${catData.category}, ${colData.label}: ${colData.score !== null ? `${colData.score}% (${colData.correct} of ${colData.total})` : "No data"}`}
                                    >
                                        {colData.score !== null ? (
                                            <span className="flex items-center gap-0.5">
                                                {colData.score}%
                                                {colData.trend && (
                                                    <span className={cn("text-[10px]", getTrendColor(colData.trend))}>
                                                        {getTrendIndicator(colData.trend)}
                                                    </span>
                                                )}
                                            </span>
                                        ) : (
                                            "—"
                                        )}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Legend */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3 border-t border-border pt-4 text-xs">
                    <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-sm bg-success" />
                        <span className="text-muted-foreground">90%+</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-sm bg-success/60" />
                        <span className="text-muted-foreground">70-89%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-sm bg-warning" />
                        <span className="text-muted-foreground">50-69%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-sm bg-destructive/70" />
                        <span className="text-muted-foreground">&lt;50%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-sm bg-muted opacity-50" />
                        <span className="text-muted-foreground">Low sample</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="text-success">↑</span>/<span className="text-destructive">↓</span> Trend
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default TopicHeatmap;
