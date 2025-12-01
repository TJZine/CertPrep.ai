'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Brain, Clock, History, Trophy, Play } from 'lucide-react';
import { useQuizWithStats } from '@/hooks/useDatabase';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { useAuth } from '@/components/providers/AuthProvider';
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId';

export default function QuizLobbyPage(): React.ReactElement {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : '';
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId(user?.id);

  const { quiz, stats, isLoading } = useQuizWithStats(id, effectiveUserId ?? undefined);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner size="lg" text="Loading quiz details..." />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="p-4">
        <EmptyState
          title="Quiz Not Found"
          description="The quiz you are looking for does not exist or has been deleted."
          icon={<Brain className="h-12 w-12 text-slate-400" />}
          action={
            <Button onClick={() => router.push('/')} leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to Library
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/')}
          className="mb-4 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Back to Library
        </Button>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">{quiz.title}</h1>
            {quiz.description && (
              <p className="mt-2 text-lg text-slate-600 dark:text-slate-300">{quiz.description}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {quiz.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
              <Badge variant="outline" className="ml-2">
                {quiz.questions.length} Questions
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && stats.attemptCount > 0 && (
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
                <History className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Attempts</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                  {stats.attemptCount}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
                <Trophy className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Best Score</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                  {stats.bestScore ?? 0}%
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/30">
                <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Last Attempt</p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-50">
                  {stats.lastAttemptDate
                    ? new Date(stats.lastAttemptDate).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mode Selection */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Zen Mode */}
        <Card className="group relative overflow-hidden transition-all hover:border-blue-500 hover:shadow-md dark:hover:border-blue-400">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Brain className="h-6 w-6 text-blue-500" />
              Zen Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-6 text-slate-600 dark:text-slate-300">
              Practice at your own pace with immediate feedback. Perfect for learning new material.
            </p>
            <ul className="mb-8 space-y-2 text-sm text-slate-500 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                Untimed environment
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                Instant answer explanations
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                AI Tutor assistance
              </li>
            </ul>
            <Button
              className="w-full"
              size="lg"
              onClick={() => router.push(`/quiz/${id}/zen`)}
              leftIcon={<Play className="h-5 w-5" />}
            >
              Start Practice
            </Button>
          </CardContent>
        </Card>

        {/* Proctor Mode */}
        <Card className="group relative overflow-hidden transition-all hover:border-amber-500 hover:shadow-md dark:hover:border-amber-400">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Clock className="h-6 w-6 text-amber-500" />
              Proctor Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-6 text-slate-600 dark:text-slate-300">
              Simulate real exam conditions. Timed, no hints, and results only at the end.
            </p>
            <ul className="mb-8 space-y-2 text-sm text-slate-500 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Strict time limits
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                No immediate feedback
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Final score report
              </li>
            </ul>
            <Button
              className="w-full"
              variant="outline"
              size="lg"
              onClick={() => router.push(`/quiz/${id}/proctor`)}
              leftIcon={<Play className="h-5 w-5" />}
            >
              Start Exam
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
