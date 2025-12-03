'use client';

import * as React from 'react';
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
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Target } from 'lucide-react';
import { useIsDarkMode } from '@/hooks/useIsDarkMode';

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

type TopicTooltipProps = TooltipProps<number, string> & { payload?: Array<{ payload: CategoryTooltipData }> };

function TopicRadarTooltip({ active, payload }: TopicTooltipProps): React.ReactElement | null {
  const currentPayload = payload?.[0];
  if (!active || !currentPayload) return null;

  const data = currentPayload.payload as CategoryTooltipData;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="font-semibold text-slate-900 dark:text-slate-50">{data.fullName}</p>
      <p className="text-sm text-slate-600 dark:text-slate-200">
        Score: <span className="font-semibold">{data.score}%</span>
      </p>
      <p className="text-sm text-slate-600 dark:text-slate-200">
        {data.correct} of {data.total} correct
      </p>
    </div>
  );
}

/**
 * Radar chart visualization of performance across categories.
 * Shows strengths and weaknesses at a glance.
 */
export function TopicRadar({ categories, className }: TopicRadarProps): React.ReactElement {
  const isDark = useIsDarkMode();

  const chartData = React.useMemo(() => {
    return categories.map((cat) => ({
      subject: cat.category.length > 15 ? `${cat.category.substring(0, 15)}...` : cat.category,
      fullName: cat.category,
      score: cat.score,
      correct: cat.correct,
      total: cat.total,
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
          <p className="text-center text-slate-500 dark:text-slate-300">No category data available</p>
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
              <div key={cat.category} className="flex items-center justify-between">
                <span className="font-medium text-slate-700 dark:text-slate-200">{cat.category}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className={cn('h-full bg-blue-500', `w-pct-${Math.round(cat.score)}`)} />
                  </div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">{cat.score}%</span>
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
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
              <PolarGrid stroke={isDark ? '#1f2937' : '#e2e8f0'} />
              <PolarAngleAxis dataKey="subject" tick={{ fill: isDark ? '#cbd5e1' : '#64748b', fontSize: 12 }} tickLine={false} />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: isDark ? '#cbd5e1' : '#94a3b8', fontSize: 10 }}
                tickCount={5}
              />
              <Radar name="Score" dataKey="score" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.3} strokeWidth={2} />
              <Tooltip content={<TopicRadarTooltip />} />
              <Legend wrapperStyle={{ color: isDark ? '#e2e8f0' : '#0f172a' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{averageScore}%</p>
            <p className="text-xs text-slate-500 dark:text-slate-300">Average</p>
          </div>

          {strongest && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="h-4 w-4 text-green-500" aria-hidden="true" />
                <p className="text-sm font-semibold text-green-700 dark:text-green-200">{strongest.score}%</p>
              </div>
              <p className="truncate text-xs text-slate-500 dark:text-slate-300" title={strongest.category}>
                {strongest.category}
              </p>
            </div>
          )}

          {weakest && weakest !== strongest && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <TrendingDown className="h-4 w-4 text-red-500" aria-hidden="true" />
                <p className="text-sm font-semibold text-red-700 dark:text-red-200">{weakest.score}%</p>
              </div>
              <p className="truncate text-xs text-slate-500 dark:text-slate-300" title={weakest.category}>
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
  className?: string;
}

/**
 * Linear breakdown of categories sorted by score.
 */
export function CategoryBreakdown({ categories, className }: CategoryBreakdownProps): React.ReactElement {
  const sorted = React.useMemo(() => {
    return [...categories].sort((a, b) => b.score - a.score);
  }, [categories]);

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getScoreBadge = (score: number): 'success' | 'default' | 'warning' | 'danger' => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'default';
    if (score >= 40) return 'warning';
    return 'danger';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Category Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sorted.map((cat) => (
            <div key={cat.category}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{cat.category}</span>
                <Badge variant={getScoreBadge(cat.score)}>{cat.score}%</Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div className={cn('h-full transition-all', getScoreColor(cat.score), `w-pct-${Math.round(cat.score)}`)} />
                </div>
                <span className="w-16 text-right text-xs text-slate-500 dark:text-slate-300">
                  {cat.correct}/{cat.total}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default TopicRadar;
