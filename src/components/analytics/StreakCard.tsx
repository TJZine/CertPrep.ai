"use client";

import * as React from "react";
import { Flame, Trophy, Calendar } from "lucide-react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface StreakCardProps {
    currentStreak: number;
    longestStreak: number;
    consistencyScore: number;
    last7DaysActivity: boolean[];
    className?: string;
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Returns day abbreviation for index from today going backwards.
 */
function getDayLabel(daysAgo: number): string {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return DAYS_OF_WEEK[date.getDay()] ?? "";
}

/**
 * 7-day activity heatmap component.
 */
function ActivityHeatmap({
    activity,
}: {
    activity: boolean[];
}): React.ReactElement {
    // Reverse to show oldest to newest (left to right)
    const reversed = [...activity].reverse();

    return (
        <div className="flex items-end gap-1">
            {reversed.map((active, index) => {
                const daysAgo = 6 - index; // Convert back to days ago
                return (
                    <div key={daysAgo} className="flex flex-col items-center gap-1">
                        <div
                            className={cn(
                                "h-8 w-8 rounded-md transition-colors",
                                active
                                    ? "bg-success"
                                    : "bg-muted",
                            )}
                            title={`${getDayLabel(daysAgo)}: ${active ? "Active" : "No activity"}`}
                        />
                        <span className="text-xs text-muted-foreground">
                            {getDayLabel(daysAgo)}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

/**
 * Stat display with icon and value.
 */
function StatItem({
    icon: Icon,
    label,
    value,
    valueColor,
}: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    valueColor?: string;
}): React.ReactElement {
    return (
        <div className="flex items-center gap-3">
            <div className="rounded-full bg-warning/10 p-2">
                <Icon
                    className="h-5 w-5 text-warning"
                    aria-hidden="true"
                />
            </div>
            <div>
                <p className={cn("text-2xl font-bold", valueColor)}>{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
            </div>
        </div>
    );
}

/**
 * Card displaying study streaks, consistency score, and 7-day activity heatmap.
 */
export function StreakCard({
    currentStreak,
    longestStreak,
    consistencyScore,
    last7DaysActivity,
    className,
}: StreakCardProps): React.ReactElement {
    const hasActivity = last7DaysActivity.some((day) => day);

    if (!hasActivity && currentStreak === 0 && longestStreak === 0) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Flame className="h-5 w-5 text-warning" aria-hidden="true" />
                        Study Streak
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-muted-foreground">
                        Complete a quiz today to start your streak! 🔥
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-warning" aria-hidden="true" />
                    Study Streak
                </CardTitle>
                <CardDescription>
                    Stay consistent to build your streak
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-4">
                        <StatItem
                            icon={Flame}
                            label="Current Streak"
                            value={`${currentStreak} day${currentStreak !== 1 ? "s" : ""}`}
                            valueColor={
                                currentStreak > 0
                                    ? "text-warning"
                                    : "text-muted-foreground"
                            }
                        />

                        <StatItem
                            icon={Trophy}
                            label="Longest Streak"
                            value={`${longestStreak} day${longestStreak !== 1 ? "s" : ""}`}
                            valueColor="text-foreground"
                        />

                        <StatItem
                            icon={Calendar}
                            label="30-Day Consistency"
                            value={`${consistencyScore}%`}
                            valueColor={
                                consistencyScore >= 50
                                    ? "text-success"
                                    : "text-muted-foreground"
                            }
                        />
                    </div>

                    <div className="flex flex-col justify-center">
                        <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                            Last 7 Days
                        </h4>
                        <ActivityHeatmap activity={last7DaysActivity} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default StreakCard;
