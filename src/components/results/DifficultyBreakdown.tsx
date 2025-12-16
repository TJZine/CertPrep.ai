"use client";

import * as React from "react";
import { Gauge } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { Question } from "@/types/quiz";

interface DifficultyBreakdownProps {
    questions: Array<{
        question: Question;
        isCorrect: boolean;
    }>;
    className?: string;
}

type DifficultyLabel = "Easy" | "Medium" | "Hard";

interface DifficultyStats {
    label: DifficultyLabel;
    correct: number;
    total: number;
    percentage: number;
    color: string;
    bgColor: string;
}

/**
 * Normalize difficulty string to expected title-case format.
 * Handles case-insensitive input and unknown values.
 */
function normalizeDifficulty(raw: string | undefined): DifficultyLabel {
    const normalized = (raw || "medium").trim().toLowerCase();
    if (normalized === "easy") return "Easy";
    if (normalized === "hard") return "Hard";
    return "Medium";
}

/**
 * Determine performance message based on difficulty breakdown stats.
 */
function getPerformanceMessage(stats: DifficultyStats[]): string {
    const hardPct = stats.find((s) => s.label === "Hard")?.percentage ?? 0;
    const easyPct = stats.find((s) => s.label === "Easy")?.percentage ?? 0;

    if (hardPct >= 70) return "💪 Great work on hard questions!";
    if (easyPct < 80) return "📚 Focus on fundamentals first";
    return "📈 Ready to tackle harder content";
}

/**
 * Breakdown of performance by question difficulty level.
 * Shows correct/total and percentage for Easy, Medium, and Hard questions.
 */
export function DifficultyBreakdown({
    questions,
    className,
}: DifficultyBreakdownProps): React.ReactElement | null {
    const stats = React.useMemo((): DifficultyStats[] => {
        const difficultyMap = new Map<DifficultyLabel, { correct: number; total: number }>();

        const levels: DifficultyLabel[] = ["Easy", "Medium", "Hard"];

        // Initialize with expected difficulty levels
        levels.forEach((level) => {
            difficultyMap.set(level, { correct: 0, total: 0 });
        });

        // Count questions by difficulty
        questions.forEach(({ question, isCorrect }) => {
            const difficulty = normalizeDifficulty(question.difficulty);
            // Non-null assertion safe: all levels initialized above
            const current = difficultyMap.get(difficulty)!;
            current.total += 1;
            if (isCorrect) {
                current.correct += 1;
            }
            // No need to .set() — we mutate the existing object in place
        });

        const colors: Record<DifficultyLabel, { color: string; bgColor: string }> = {
            Easy: { color: "text-success", bgColor: "bg-success" },
            Medium: { color: "text-warning", bgColor: "bg-warning" },
            Hard: { color: "text-destructive", bgColor: "bg-destructive" },
        };

        return levels
            .map((level) => {
                const data = difficultyMap.get(level) || { correct: 0, total: 0 };
                const percentage = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                return {
                    label: level,
                    correct: data.correct,
                    total: data.total,
                    percentage,
                    color: colors[level]?.color || "text-muted-foreground",
                    bgColor: colors[level]?.bgColor || "bg-muted",
                };
            })
            .filter((stat) => stat.total > 0); // Only show levels that have questions
    }, [questions]);

    // Don't render if no difficulty data available
    if (stats.length === 0) {
        return null;
    }

    return (
        <Card className={className}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Gauge className="h-4 w-4" aria-hidden="true" />
                    Difficulty Breakdown
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {stats.map((stat) => (
                    <div key={stat.label} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                            <span className={cn("font-medium", stat.color)}>{stat.label}</span>
                            <span className="text-muted-foreground">
                                {stat.correct}/{stat.total} ({stat.percentage}%)
                            </span>
                        </div>
                        <div
                            className="h-2 w-full overflow-hidden rounded-full bg-secondary"
                            role="progressbar"
                            aria-valuenow={stat.percentage}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${stat.label} accuracy: ${stat.percentage}%`}
                        >
                            <div
                                className={cn("h-full transition-all duration-500", stat.bgColor)}
                                style={{ width: `${stat.percentage}%` }}
                            />
                        </div>
                    </div>
                ))}

                <p className="pt-2 text-xs text-muted-foreground">
                    {getPerformanceMessage(stats)}
                </p>
            </CardContent>
        </Card>
    );
}

export default DifficultyBreakdown;
