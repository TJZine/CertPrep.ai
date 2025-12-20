"use client";

import * as React from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    type TooltipProps,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { TrendingUp } from "lucide-react";
import { useChartColors } from "@/hooks/useChartColors";
import { useChartDimensions } from "@/hooks/useChartDimensions";
import type { CategoryTrendPoint } from "@/hooks/useCategoryTrends";

interface CategoryTrendChartProps {
    /** Time-series data with weekly aggregated scores per category */
    data: CategoryTrendPoint[];
    /** Categories to display (max 5 for readability) */
    categories: string[];
    className?: string;
}

// Distinct colors for up to 5 category lines.
// INTENTIONAL: These are hardcoded rather than theme-derived to ensure
// consistent, visually distinct category differentiation across all themes.
// Theme-derived colors may produce too-similar shades that reduce chart legibility.
const CATEGORY_COLORS = [
    "#3b82f6", // blue
    "#22c55e", // green
    "#f59e0b", // amber
    "#8b5cf6", // violet
    "#ec4899", // pink
];


interface TrendPayloadEntry {
    name: string;
    value: number;
    color: string;
}

type TrendTooltipProps = TooltipProps<number, string> & {
    payload?: TrendPayloadEntry[];
    label?: string | number;
};

function TrendTooltip({
    active,
    payload,
    label,
}: TrendTooltipProps): React.ReactElement | null {
    if (!active || !payload?.length) return null;

    return (
        <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
            <p className="mb-2 font-semibold text-popover-foreground">
                {String(label)}
            </p>
            {payload.map((entry) => (
                <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
                    {entry.name}: <span className="font-semibold">{entry.value}%</span>
                </p>
            ))}
        </div>
    );
}

/**
 * Line chart showing category proficiency trends over time.
 * Displays weekly aggregated scores for up to 5 categories.
 */
export function CategoryTrendChart({
    data,
    categories,
    className,
}: CategoryTrendChartProps): React.ReactElement {
    const { colors, isReady: colorsReady } = useChartColors();
    const { containerRef, isReady: dimensionsReady } = useChartDimensions();

    // Limit to 5 categories for visual clarity
    const displayCategories = categories.slice(0, 5);
    const isEmpty = data.length === 0;
    const needsMoreData = data.length < 2;
    const isReady = colorsReady && dimensionsReady;

    // Always render full Card structure for stable height
    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" aria-hidden="true" />
                    Category Trends
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div ref={containerRef} className="h-[300px] w-full">
                    {isEmpty || needsMoreData ? (
                        // Empty state - same height as chart
                        <div className="flex h-full flex-col items-center justify-center text-center">
                            <TrendingUp className="h-12 w-12 text-muted-foreground/30" aria-hidden="true" />
                            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                                {isEmpty
                                    ? "Complete quizzes over multiple weeks to see proficiency trends."
                                    : "Need at least 2 weeks of data to show trends. Keep studying!"}
                            </p>
                        </div>
                    ) : isReady ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={data}
                                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                                <XAxis
                                    dataKey="week"
                                    tick={{ fill: colors.muted, fontSize: 12 }}
                                    tickLine={false}
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    tick={{ fill: colors.muted, fontSize: 12 }}
                                    tickLine={false}
                                    tickFormatter={(value: number) => `${value}%`}
                                />
                                <Tooltip content={<TrendTooltip />} />
                                <Legend
                                    formatter={(value: string) => (
                                        <span className="text-sm text-muted-foreground">
                                            {value}
                                        </span>
                                    )}
                                />
                                {displayCategories.map((category, index) => (
                                    <Line
                                        key={category}
                                        type="monotone"
                                        dataKey={category}
                                        name={category}
                                        stroke={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                                        strokeWidth={2}
                                        dot={{ r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center" role="status" aria-label="Loading chart">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" aria-hidden="true" />
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export default CategoryTrendChart;
