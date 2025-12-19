"use client";

import * as React from "react";
import { Flame, Trophy, Calendar, Clock } from "lucide-react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/Card";
import { formatDateKey } from "@/lib/date";
import { cn } from "@/lib/utils";
import { EmptyCardState } from "@/components/analytics/EmptyCardState";

interface DailyStudyData {
    date: string;
    minutes: number;
}

interface StreakCardProps {
    currentStreak: number;
    longestStreak: number;
    consistencyScore: number;
    last7DaysActivity: boolean[];
    dailyStudyTime?: DailyStudyData[];
    /** Human-readable label for the filtered date range (e.g., "Last 7 days") */
    studyTimeRangeLabel?: string;
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
 * Get study minutes for a specific day (daysAgo from today).
 * Handles both Date objects and YYYY-MM-DD strings to avoid timezone shifts.
 */
function getMinutesForDay(dailyData: DailyStudyData[], daysAgo: number): number {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - daysAgo);
    const targetDateKey = formatDateKey(targetDate);

    const match = dailyData.find((d) => {
        // If d.date is already a YYYY-MM-DD string, use it directly to avoid
        // UTC midnight → local time shift (e.g., "2025-12-12" becoming Dec 11 in EST)
        const dateKey =
            typeof d.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.date)
                ? d.date
                : formatDateKey(d.date);
        return dateKey === targetDateKey;
    });
    return match?.minutes ?? 0;
}

/**
 * Get color intensity based on study minutes.
 */
function getBarColor(minutes: number, maxMinutes: number): string {
    if (minutes === 0) return "bg-muted";
    if (maxMinutes === 0) return "bg-success/30";

    const intensity = Math.min(minutes / maxMinutes, 1);

    if (intensity >= 0.8) return "bg-success";
    if (intensity >= 0.5) return "bg-success/70";
    if (intensity >= 0.25) return "bg-success/50";
    return "bg-success/30";
}

/**
 * Format minutes to human readable string.
 */
function formatMinutes(totalMinutes: number): string {
    if (totalMinutes < 60) {
        return `${totalMinutes}m`;
    }
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * 7-day study activity mini-bars with intensity-based colors.
 */
function StudyActivityBars({
    last7DaysActivity,
    dailyStudyTime = [],
}: {
    last7DaysActivity: boolean[];
    dailyStudyTime?: DailyStudyData[];
}): React.ReactElement {
    // Calculate data for last 7 days
    const last7DaysData = React.useMemo(() => {
        const data: Array<{ daysAgo: number; minutes: number; hasActivity: boolean }> = [];
        for (let i = 6; i >= 0; i--) {
            const minutes = getMinutesForDay(dailyStudyTime, i);
            const hasActivity = last7DaysActivity[i] ?? false;
            data.push({ daysAgo: i, minutes, hasActivity });
        }
        return data;
    }, [last7DaysActivity, dailyStudyTime]);

    const maxMinutes = Math.max(...last7DaysData.map((d) => d.minutes), 1);
    const totalMinutes = last7DaysData.reduce((sum, d) => sum + d.minutes, 0);
    const avgMinutes = Math.round(totalMinutes / 7);

    return (
        <div className="space-y-3">
            <div className="flex items-end justify-between gap-1" style={{ height: "80px" }}>
                {last7DaysData.map(({ daysAgo, minutes, hasActivity }) => {
                    // Calculate bar height (min 8px, max 72px)
                    const heightPercent = maxMinutes > 0 ? (minutes / maxMinutes) * 100 : 0;
                    const minHeight = hasActivity || minutes > 0 ? 12 : 8;
                    const barHeight = Math.max(minHeight, (heightPercent / 100) * 72);

                    return (
                        <div
                            key={daysAgo}
                            className="flex flex-1 flex-col items-center gap-1"
                        >
                            <div
                                className="relative flex w-full items-end justify-center"
                                style={{ height: "72px" }}
                            >
                                <div
                                    role="img"
                                    aria-label={`${getDayLabel(daysAgo)}: ${minutes > 0 ? formatMinutes(minutes) : "No activity"}`}
                                    className={cn(
                                        "w-full max-w-[32px] rounded-t-md transition-all",
                                        getBarColor(minutes, maxMinutes),
                                    )}
                                    style={{ height: `${barHeight}px` }}
                                    title={`${getDayLabel(daysAgo)}: ${minutes > 0 ? formatMinutes(minutes) : "No activity"}`}
                                />
                            </div>
                            <span
                                className={cn(
                                    "text-xs",
                                    daysAgo === 0
                                        ? "font-semibold text-foreground"
                                        : "text-muted-foreground",
                                )}
                            >
                                {daysAgo === 0 ? "Today" : getDayLabel(daysAgo)}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Summary stats */}
            <div className="flex items-center justify-center gap-4 border-t border-border pt-3">
                <div className="flex items-center gap-1.5 text-sm">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                    <span className="font-medium text-foreground">
                        {formatMinutes(totalMinutes)}
                    </span>
                    <span className="text-muted-foreground">total</span>
                </div>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-1.5 text-sm">
                    <span className="font-medium text-foreground">
                        {formatMinutes(avgMinutes)}
                    </span>
                    <span className="text-muted-foreground">avg/day</span>
                </div>
            </div>
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
 * Card displaying study streaks, consistency score, and 7-day activity with study time.
 */
export function StreakCard({
    currentStreak,
    longestStreak,
    consistencyScore,
    last7DaysActivity,
    dailyStudyTime = [],
    studyTimeRangeLabel,
    className,
}: StreakCardProps): React.ReactElement {
    const hasActivity = last7DaysActivity.some((day) => day);

    if (!hasActivity && currentStreak === 0 && longestStreak === 0) {
        return (
            <EmptyCardState
                className={className}
                headerIcon={<Flame className="h-5 w-5 text-warning" aria-hidden="true" />}
                icon={<Flame className="text-warning" aria-hidden="true" />}
                title="Study Streak"
                description="Complete a quiz today to start your streak! 🔥"
            />
        );
    }

    return (
        <Card className={className} data-testid="streak-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-warning" aria-hidden="true" />
                    Study Streak
                </CardTitle>
                <CardDescription>
                    {studyTimeRangeLabel
                        ? `Study time: ${studyTimeRangeLabel.toLowerCase()}`
                        : "Stay consistent to build your streak"}
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
                        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                            Last 7 Days
                        </h3>
                        <StudyActivityBars
                            last7DaysActivity={last7DaysActivity}
                            dailyStudyTime={dailyStudyTime}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default StreakCard;
