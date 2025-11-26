'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, TooltipProps } from 'recharts';
import { TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ScorecardCompact } from '@/components/results/Scorecard';
import { cn } from '@/lib/utils';
import type { Result } from '@/types/result';

interface PerformanceHistoryProps {
  results: Result[];
  quizTitles: Map<string, string>;
  className?: string;
}

interface PerformancePoint {
  score: number;
  date: string;
  mode: string;
  quizTitle: string;
}

type PerformanceTooltipProps = TooltipProps<number, string> & { payload?: Array<{ payload: PerformancePoint }> };

function PerformanceHistoryTooltip({ active, payload }: PerformanceTooltipProps): React.ReactElement | null {
  const currentPayload = payload?.[0];
  if (!active || !currentPayload) return null;

  const data = currentPayload.payload as PerformancePoint;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="font-semibold text-slate-900 dark:text-slate-50">{data.quizTitle}</p>
      <p className="text-sm text-slate-600 dark:text-slate-200">
        Score: <span className="font-semibold">{data.score}%</span>
      </p>
      <p className="text-sm text-slate-600 dark:text-slate-200">Date: {data.date}</p>
      <Badge variant={data.mode === 'zen' ? 'default' : 'secondary'} className="mt-1">
        {data.mode === 'zen' ? 'Study' : 'Exam'}
      </Badge>
    </div>
  );
}

/**
 * Performance history chart and recent results list.
 */
export function PerformanceHistory({ results, quizTitles, className }: PerformanceHistoryProps): React.ReactElement {
  const router = useRouter();
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect((): (() => void) => {
    if (typeof window === 'undefined') return () => {};
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = (): void => {
      const hasDarkClass = document.documentElement.classList.contains('dark');
      setIsDark(hasDarkClass || media.matches);
    };
    update();
    const handleChange = (event: MediaQueryListEvent): void => {
      const hasDarkClass = document.documentElement.classList.contains('dark');
      setIsDark(hasDarkClass || event.matches);
    };
    media.addEventListener?.('change', handleChange);
    media.addListener?.(handleChange);
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return (): void => {
      media.removeEventListener?.('change', handleChange);
      media.removeListener?.(handleChange);
      observer.disconnect();
    };
  }, []);

  const sortedResults = React.useMemo(() => [...results].sort((a, b) => b.timestamp - a.timestamp), [results]);
  const [showAllResults, setShowAllResults] = React.useState(false);

  const trend = React.useMemo(() => {
    if (sortedResults.length < 2) return null;

    const recent = sortedResults.slice(0, Math.min(3, sortedResults.length));
    const older = sortedResults.slice(3, Math.min(6, sortedResults.length));
    if (older.length === 0) return null;

    const recentAvg = recent.reduce((sum, r) => sum + r.score, 0) / recent.length;
    const olderAvg = older.reduce((sum, r) => sum + r.score, 0) / older.length;
    const diff = Math.round(recentAvg - olderAvg);

    return {
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable',
      value: Math.abs(diff),
    } as const;
  }, [sortedResults]);

  const chartData = React.useMemo(() => {
    return sortedResults
      .slice(0, 20)
      .reverse()
      .map((r, index) => ({
        index: index + 1,
        score: r.score,
        date: new Date(r.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        mode: r.mode,
        quizTitle: quizTitles.get(r.quiz_id) || 'Unknown Quiz',
      }));
  }, [sortedResults, quizTitles]);

  const averageScore = React.useMemo(() => {
    if (results.length === 0) return 0;
    return Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);
  }, [results]);

  if (results.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Performance History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-slate-500">Complete some quizzes to see your performance history.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Performance History</CardTitle>
            <CardDescription>Your score trends over time</CardDescription>
          </div>

          {trend && (
            <div
              className={cn(
                'flex items-center gap-1 rounded-full px-3 py-1',
                trend.direction === 'up'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200'
                  : trend.direction === 'down'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100',
              )}
            >
              {trend.direction === 'up' && <TrendingUp className="h-4 w-4" aria-hidden="true" />}
              {trend.direction === 'down' && <TrendingDown className="h-4 w-4" aria-hidden="true" />}
              <span className="text-sm font-medium">
                {trend.direction === 'stable' ? 'Stable' : `${trend.direction === 'up' ? '+' : '-'}${trend.value}%`}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1f2937' : '#e2e8f0'} />
              <XAxis dataKey="date" tick={{ fill: isDark ? '#cbd5e1' : '#64748b', fontSize: 12 }} tickLine={false} />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: isDark ? '#cbd5e1' : '#64748b', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<PerformanceHistoryTooltip />} />
              <ReferenceLine
                y={averageScore}
                stroke={isDark ? '#94a3b8' : '#94a3b8'}
                strokeDasharray="5 5"
                label={{
                  value: `Avg: ${averageScore}%`,
                  position: 'right',
                  fill: isDark ? '#cbd5e1' : '#64748b',
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ fill: '#2563eb', strokeWidth: 2, r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-6">
          <h4 className="mb-4 font-semibold text-slate-900">Recent Results</h4>
          <div className="space-y-2">
            {(showAllResults ? sortedResults : sortedResults.slice(0, 5)).map((result) => (
              <ScorecardCompact
                key={result.id}
                score={result.score}
                mode={result.mode}
                timestamp={result.timestamp}
                timeTakenSeconds={result.time_taken_seconds}
                onClick={() => router.push(`/results/${result.id}`)}
              />
            ))}
          </div>

          {sortedResults.length > 5 && !showAllResults && (
            <Button
              variant="ghost"
              className="mt-4 w-full"
              rightIcon={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
              onClick={() => setShowAllResults(true)}
            >
              View All {sortedResults.length} Results
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default PerformanceHistory;
