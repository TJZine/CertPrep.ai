"use client";

import * as React from "react";
import { BarChart3, Lightbulb, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface SelfAssessmentSummaryProps {
    difficultyRatings: Record<string, 1 | 2 | 3>;
    questionStatus: Record<string, boolean>;
    className?: string;
}

interface RatingStats {
    again: number;
    hard: number;
    good: number;
    luckyGuesses: number;
    overconfident: number;
    calibrated: number;
}

/**
 * Displays self-assessment calibration insights from Zen mode ratings.
 * Shows how well the user's self-assessment matches their actual performance.
 */
export function SelfAssessmentSummary({
    difficultyRatings,
    questionStatus,
    className,
}: SelfAssessmentSummaryProps): React.ReactElement | null {
    const stats = React.useMemo((): RatingStats | null => {
        const entries = Object.entries(difficultyRatings);
        if (entries.length === 0) return null;

        const result: RatingStats = {
            again: 0,
            hard: 0,
            good: 0,
            luckyGuesses: 0,
            overconfident: 0,
            calibrated: 0,
        };

        entries.forEach(([questionId, rating]) => {
            const status = questionStatus[questionId];

            // Always count ratings
            if (rating === 1) result.again++;
            else if (rating === 2) result.hard++;
            else if (rating === 3) result.good++;

            // Only calculate calibration insights when we know the answer status
            if (status === undefined) return;

            // Calibration insights (status is now guaranteed to be boolean)
            if (rating === 1 && status) {
                // Rated "Again" but got it right
                result.luckyGuesses++;
            } else if (rating === 3 && !status) {
                // Rated "Good" but got it wrong
                result.overconfident++;
            } else if (rating === 3 && status) {
                // Rated "Good" and got it right
                result.calibrated++;
            }
        });

        return result;
    }, [difficultyRatings, questionStatus]);

    // Don't render if no ratings
    if (!stats) {
        return null;
    }

    const totalRatings = stats.again + stats.hard + stats.good;
    const hasInsights = stats.luckyGuesses > 0 || stats.overconfident > 0;

    return (
        <Card className={className}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4" aria-hidden="true" />
                    Self-Assessment
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Rating breakdown */}
                <div className="flex items-center gap-2">
                    <div className="flex flex-1 flex-col items-center rounded-lg border border-border p-2">
                        <span className="text-lg font-semibold text-destructive">
                            {stats.again}
                        </span>
                        <span className="text-xs text-muted-foreground">Again</span>
                    </div>
                    <div className="flex flex-1 flex-col items-center rounded-lg border border-border p-2">
                        <span className="text-lg font-semibold text-warning">
                            {stats.hard}
                        </span>
                        <span className="text-xs text-muted-foreground">Hard</span>
                    </div>
                    <div className="flex flex-1 flex-col items-center rounded-lg border border-border p-2">
                        <span className="text-lg font-semibold text-success">
                            {stats.good}
                        </span>
                        <span className="text-xs text-muted-foreground">Good</span>
                    </div>
                </div>

                {/* Calibration insights */}
                {hasInsights && (
                    <div className="space-y-2 rounded-lg bg-muted/50 p-3">
                        <p className="text-sm font-medium text-foreground">
                            Calibration Insights
                        </p>
                        <div className="space-y-1">
                            {stats.luckyGuesses > 0 && (
                                <div className="flex items-center gap-2 text-sm">
                                    <Lightbulb
                                        className="h-4 w-4 text-success"
                                        aria-hidden="true"
                                    />
                                    <span className="text-muted-foreground">
                                        <span className="font-medium text-foreground">
                                            {stats.luckyGuesses}
                                        </span>{" "}
                                        lucky {stats.luckyGuesses === 1 ? "guess" : "guesses"}
                                        <span className="text-xs ml-1 text-muted-foreground">
                                            (rated Again but correct)
                                        </span>
                                    </span>
                                </div>
                            )}
                            {stats.overconfident > 0 && (
                                <div className="flex items-center gap-2 text-sm">
                                    <AlertCircle
                                        className="h-4 w-4 text-warning"
                                        aria-hidden="true"
                                    />
                                    <span className="text-muted-foreground">
                                        <span className="font-medium text-foreground">
                                            {stats.overconfident}
                                        </span>{" "}
                                        overconfident
                                        <span className="text-xs ml-1 text-muted-foreground">
                                            (rated Good but wrong)
                                        </span>
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Calibration score */}
                {stats.good > 0 && (
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                            Calibration accuracy
                        </span>
                        <Badge
                            variant={
                                stats.calibrated / stats.good >= 0.8
                                    ? "success"
                                    : stats.calibrated / stats.good >= 0.6
                                        ? "warning"
                                        : "danger"
                            }
                        >
                            {Math.round((stats.calibrated / stats.good) * 100)}%
                        </Badge>
                    </div>
                )}

                <p className="text-xs text-muted-foreground">
                    {totalRatings} question{totalRatings === 1 ? "" : "s"} rated during
                    this session
                </p>
            </CardContent>
        </Card>
    );
}

export default SelfAssessmentSummary;
