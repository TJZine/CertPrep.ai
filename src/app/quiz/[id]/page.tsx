"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Brain, Clock, History, Trophy, Play, Shuffle } from "lucide-react";
import { useQuizWithStats } from "@/hooks/useDatabase";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/Switch";
import { QuizLobbySkeleton } from "@/components/quiz/QuizLobbySkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";

export default function QuizLobbyPage(): React.ReactElement {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId(user?.id);

  const { quiz, stats, isLoading } = useQuizWithStats(
    id,
    effectiveUserId ?? undefined,
  );

  const [isRemixEnabled, setIsRemixEnabled] = React.useState(false);

  if (isLoading) {
    return <QuizLobbySkeleton />;
  }

  if (!quiz) {
    return (
      <div className="p-4">
        <EmptyState
          title="Quiz Not Found"
          description="The quiz you are looking for does not exist or has been deleted."
          icon={<Brain className="h-12 w-12 text-muted-foreground" />}
          action={
            <Button
              onClick={() => router.push("/")}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
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
          onClick={() => router.push("/")}
          className="mb-4 text-muted-foreground hover:text-foreground"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Back to Library
        </Button>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {quiz.title}
            </h1>
            {quiz.description && (
              <p className="mt-2 text-lg text-muted-foreground">
                {quiz.description}
              </p>
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
              <div className="rounded-full bg-info/10 p-3">
                <History className="h-6 w-6 text-info" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Attempts
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.attemptCount}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-success/10 p-3">
                <Trophy className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Best Score
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.bestScore ?? 0}%
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-accent/10 p-3">
                <Clock className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Last Attempt
                </p>
                <p className="text-sm font-bold text-foreground">
                  {stats.lastAttemptDate
                    ? new Date(stats.lastAttemptDate).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Remix Toggle */}
      <div className="mb-6 flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-accent/10 p-2">
            <Shuffle className="h-4 w-4 text-accent" />
          </div>
          <div>
            <label
              htmlFor="remix-toggle"
              className="text-sm font-medium text-foreground cursor-pointer"
            >
              Remix Mode
            </label>
            <p
              id="remix-description"
              className="text-xs text-muted-foreground"
            >
              Shuffle questions and answer order
            </p>
          </div>
        </div>
        <Switch
          id="remix-toggle"
          checked={isRemixEnabled}
          onCheckedChange={setIsRemixEnabled}
          aria-describedby="remix-description"
        />
      </div>

      {/* Mode Selection */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Zen Mode */}
        <Card className="group relative overflow-hidden transition-all hover:border-primary hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Brain className="h-6 w-6 text-primary" />
              Zen Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-6 text-muted-foreground">
              Practice at your own pace with immediate feedback. Perfect for
              learning new material.
            </p>
            <ul className="mb-8 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Untimed environment
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Instant answer explanations
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                AI Tutor assistance
              </li>
            </ul>
            <Button
              className="w-full"
              size="lg"
              onClick={() =>
                router.push(
                  `/quiz/${id}/zen${isRemixEnabled ? "?remix=true" : ""}`
                )
              }
              leftIcon={<Play className="h-5 w-5" />}
            >
              Start Practice
            </Button>
          </CardContent>
        </Card>

        {/* Proctor Mode */}
        <Card className="group relative overflow-hidden transition-all hover:border-warning hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Clock className="h-6 w-6 text-warning" />
              Proctor Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-6 text-muted-foreground">
              Simulate real exam conditions. Timed, no hints, and results only
              at the end.
            </p>
            <ul className="mb-8 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-warning" />
                Strict time limits
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-warning" />
                No immediate feedback
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-warning" />
                Final score report
              </li>
            </ul>
            <Button
              className="w-full"
              variant="outline"
              size="lg"
              onClick={() =>
                router.push(
                  `/quiz/${id}/proctor${isRemixEnabled ? "?remix=true" : ""}`
                )
              }
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
