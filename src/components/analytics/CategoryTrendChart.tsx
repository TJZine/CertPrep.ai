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

// Distinct colors for up to 5 category lines
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

    if (data.length === 0) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" aria-hidden="true" />
                        Category Trends
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-muted-foreground">
                        Complete more quizzes over multiple weeks to see proficiency trends.
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (data.length < 2) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" aria-hidden="true" />
                        Category Trends
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-muted-foreground">
                        Need at least 2 weeks of data to show trends. Keep studying!
                    </p>
                </CardContent>
            </Card>
        );
    }

    const isReady = colorsReady && dimensionsReady;

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
                    {isReady ? (
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
                        <div className="flex h-full items-center justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export default CategoryTrendChart;
