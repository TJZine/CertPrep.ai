"use client";

import * as React from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
  TooltipProps,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Target } from "lucide-react";
import { useChartColors } from "@/hooks/useChartColors";
import { useChartDimensions } from "@/hooks/useChartDimensions";

interface CategoryScore {
  category: string;
  score: number;
  correct: number;
  total: number;
}

interface TopicRadarProps {
  categories: CategoryScore[];
  className?: string;
}

interface CategoryTooltipData {
  subject: string;
  fullName: string;
  score: number;
  correct: number;
  total: number;
  fullMark: number;
}

type TopicTooltipProps = TooltipProps<number, string> & {
  payload?: Array<{ payload: CategoryTooltipData }>;
};

function TopicRadarTooltip({
  active,
  payload,
}: TopicTooltipProps): React.ReactElement | null {
  const currentPayload = payload?.[0];
  if (!active || !currentPayload) return null;

  const data = currentPayload.payload as CategoryTooltipData;
  return (
    <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
      <p className="font-semibold text-popover-foreground">
        {data.fullName}
      </p>
      <p className="text-sm text-muted-foreground">
        Score: <span className="font-semibold">{data.score}%</span>
      </p>
      <p className="text-sm text-muted-foreground">
        {data.correct} of {data.total} correct
      </p>
    </div>
  );
}

/**
 * Radar chart visualization of performance across categories.
 * Shows strengths and weaknesses at a glance.
 */
export function TopicRadar({
  categories,
  className,
}: TopicRadarProps): React.ReactElement {
  const { colors } = useChartColors();
  const { containerRef, isReady } = useChartDimensions();

  const chartData = React.useMemo(() => {
    return categories
      .filter((cat) => cat.category && typeof cat.score === "number" && !Number.isNaN(cat.score))
      .map((cat) => ({
        subject:
          cat.category.length > 15
            ? `${cat.category.substring(0, 15)}...`
            : cat.category,
        fullName: cat.category,
        score: Math.max(0, Math.min(100, Math.round(cat.score))), // Clamp to 0-100
        correct: cat.correct ?? 0,
        total: cat.total ?? 0,
        fullMark: 100,
      }));
  }, [categories]);

  const { strongest, weakest } = React.useMemo(() => {
    if (categories.length === 0) {
      return { strongest: null, weakest: null };
    }

    const sorted = [...categories].sort((a, b) => b.score - a.score);
    return {
      strongest: sorted[0],
      weakest: sorted[sorted.length - 1],
    };
  }, [categories]);

  const averageScore = React.useMemo(() => {
    if (categories.length === 0) return 0;
    const sum = categories.reduce((acc, cat) => acc + cat.score, 0);
    return Math.round(sum / categories.length);
  }, [categories]);

  if (categories.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Topic Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            No category data available
          </p>
        </CardContent>
      </Card>
    );
  }

  if (categories.length < 3) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Topic Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categories.map((cat) => (
              <div
                key={cat.category}
                className="flex items-center justify-between"
              >
                <span className="font-medium text-foreground">
                  {cat.category}
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${Math.round(cat.score)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {cat.score}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" aria-hidden="true" />
          Topic Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="h-[300px] w-full">
          {isReady ? (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart
                data={chartData}
                margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
              >
                <PolarGrid stroke={colors.grid} />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: colors.muted, fontSize: 12 }}
                  tickLine={false}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: colors.muted, fontSize: 10 }}
                  tickCount={5}
                />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke={colors.primary}
                  fill={colors.primary}
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Tooltip content={<TopicRadarTooltip />} />
                <Legend
                  formatter={(value: string) => (
                    <span className="font-medium text-muted-foreground">
                      {value}
                    </span>
                  )}
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4 border-t border-border pt-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">
              {averageScore}%
            </p>
            <p className="text-xs text-muted-foreground">
              Average
            </p>
          </div>

          {strongest && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <TrendingUp
                  className="h-4 w-4 text-success"
                  aria-hidden="true"
                />
                <p className="text-sm font-semibold text-success">
                  {strongest.score}%
                </p>
              </div>
              <p
                className="truncate text-xs text-muted-foreground"
                title={strongest.category}
              >
                {strongest.category}
              </p>
            </div>
          )}

          {weakest && weakest !== strongest && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <TrendingDown
                  className="h-4 w-4 text-destructive"
                  aria-hidden="true"
                />
                <p className="text-sm font-semibold text-destructive">
                  {weakest.score}%
                </p>
              </div>
              <p
                className="truncate text-xs text-muted-foreground"
                title={weakest.category}
              >
                {weakest.category}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface CategoryBreakdownProps {
  categories: CategoryScore[];
  onCategoryClick?: (category: string) => void;
  className?: string;
}

/**
 * Linear breakdown of categories sorted by score.
 * Categories are clickable if onCategoryClick is provided.
 */
export function CategoryBreakdown({
  categories,
  onCategoryClick,
  className,
}: CategoryBreakdownProps): React.ReactElement {
  const sorted = React.useMemo(() => {
    return [...categories].sort((a, b) => b.score - a.score);
  }, [categories]);

  const getScoreColor = (score: number): string => {
    if (score >= 80) return "bg-tier-excellent";
    if (score >= 60) return "bg-tier-great";
    if (score >= 40) return "bg-tier-passing";
    return "bg-tier-failing";
  };

  const getScoreBadge = (
    score: number,
  ): "success" | "default" | "warning" | "danger" => {
    if (score >= 80) return "success";
    if (score >= 60) return "default";
    if (score >= 40) return "warning";
    return "danger";
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Category Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sorted.map((cat) => (
            <button
              key={cat.category}
              type="button"
              onClick={() => onCategoryClick?.(cat.category)}
              disabled={!onCategoryClick}
              className={cn(
                "w-full text-left rounded-lg p-2 -m-2 transition-colors",
                onCategoryClick && "hover:bg-accent cursor-pointer"
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {cat.category}
                </span>
                <Badge variant={getScoreBadge(cat.score)}>{cat.score}%</Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full transition-all", getScoreColor(cat.score))}
                    style={{ width: `${Math.round(cat.score)}%` }}
                  />
                </div>
                <span className="w-16 text-right text-xs text-muted-foreground">
                  {cat.correct}/{cat.total}
                </span>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default TopicRadar;
