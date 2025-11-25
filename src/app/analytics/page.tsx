'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AnalyticsOverview, ScoreDistribution, StudyTimeChart } from '@/components/analytics/AnalyticsOverview';
import { PerformanceHistory } from '@/components/analytics/PerformanceHistory';
import { WeakAreasCard } from '@/components/analytics/WeakAreasCard';
import { CategoryBreakdown } from '@/components/results/TopicRadar';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { useResults, useQuizzes, useInitializeDatabase } from '@/hooks/useDatabase';
import { getOverallStats, type OverallStats } from '@/db/results';
import { BarChart3, Plus, ArrowLeft } from 'lucide-react';

/**
 * Analytics dashboard aggregating results across quizzes.
 */
export default function AnalyticsPage(): React.ReactElement {
  const router = useRouter();

  const { isInitialized, error: dbError } = useInitializeDatabase();
  const { results, isLoading: resultsLoading } = useResults();
  const { quizzes, isLoading: quizzesLoading } = useQuizzes();

  const [overallStats, setOverallStats] = React.useState<OverallStats | null>(null);
  const [statsError, setStatsError] = React.useState<string | null>(null);

  React.useEffect((): void | (() => void) => {
    if (!isInitialized) return undefined;

    let isMounted = true;
    const loadStats = async (): Promise<void> => {
      try {
        const stats = await getOverallStats();
        if (isMounted) {
          setOverallStats(stats);
          setStatsError(null);
        }
      } catch (error) {
        console.error('Failed to load overall stats', error);
        if (isMounted) {
          setStatsError('Unable to load overall stats right now.');
        }
      }
    };

    loadStats();

    return (): void => {
      isMounted = false;
    };
  }, [isInitialized, results]);

  const quizTitles = React.useMemo(() => {
    const map = new Map<string, string>();
    quizzes.forEach((q) => map.set(q.id, q.title));
    return map;
  }, [quizzes]);

  const categoryPerformance = React.useMemo(() => {
    const categories = new Map<string, { correct: number; total: number }>();

    results.forEach((result) => {
      const quiz = quizzes.find((q) => q.id === result.quiz_id);
      if (!quiz) return;

      quiz.questions.forEach((question) => {
        const category = question.category;
        if (!categories.has(category)) {
          categories.set(category, { correct: 0, total: 0 });
        }

        const cat = categories.get(category)!;
        cat.total += 1;
        if (result.answers[question.id] === question.correct_answer) {
          cat.correct += 1;
        }
      });
    });

    return Array.from(categories.entries()).map(([category, data]) => ({
      category,
      score: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      correct: data.correct,
      total: data.total,
    }));
  }, [results, quizzes]);

  const weakAreas = React.useMemo(() => {
    return categoryPerformance
      .filter((cat) => cat.score < 70 && cat.total >= 3)
      .sort((a, b) => a.score - b.score)
      .slice(0, 5)
      .map((cat) => ({
        category: cat.category,
        avgScore: cat.score,
        totalQuestions: cat.total,
      }));
  }, [categoryPerformance]);

  const dailyStudyTime = React.useMemo(() => {
    const now = new Date();
    const days: Map<string, number> = new Map();

    for (let i = 13; i >= 0; i -= 1) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      days.set(dateStr, 0);
    }

    results.forEach((result) => {
      const resultDate = new Date(result.timestamp);
      const daysDiff = Math.floor((now.getTime() - resultDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff < 14) {
        const dateStr = resultDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (days.has(dateStr)) {
          days.set(dateStr, days.get(dateStr)! + Math.round(result.time_taken_seconds / 60));
        }
      }
    });

    return Array.from(days.entries()).map(([date, minutes]) => ({ date, minutes }));
  }, [results]);

  if (!isInitialized || resultsLoading || quizzesLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" text="Loading analytics..." />
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h2 className="text-lg font-semibold text-red-800">Failed to load analytics</h2>
          <p className="mt-2 text-red-600">{dbError.message}</p>
          <Button className="mt-4" onClick={() => router.push('/')} leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold text-slate-900">Analytics</h1>

        <EmptyState
          icon={<BarChart3 className="h-12 w-12" aria-hidden="true" />}
          title="No Data Yet"
          description="Complete some quizzes to see your performance analytics and track your progress over time."
          action={
            <Button onClick={() => router.push('/')} leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}>
              Start a Quiz
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
        <p className="mt-1 text-slate-500">Track your progress and identify areas for improvement</p>
      </div>

      {statsError && <p className="mb-4 text-sm text-red-600">{statsError}</p>}
      {overallStats && <AnalyticsOverview stats={overallStats} className="mb-8" />}

      <div className="mb-8 grid gap-8 lg:grid-cols-2">
        <ScoreDistribution results={results} />
        <StudyTimeChart dailyData={dailyStudyTime} />
      </div>

      <div className="mb-8">
        <PerformanceHistory results={results} quizTitles={quizTitles} />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <CategoryBreakdown categories={categoryPerformance} />
        <WeakAreasCard
          weakAreas={weakAreas}
          onStudyArea={() => {
            // Future enhancement: start a filtered practice session for this category.
          }}
        />
      </div>
    </div>
  );
}
