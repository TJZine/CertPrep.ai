"use client";

import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play, Filter } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { DueQuestionsCard } from "@/components/srs/DueQuestionsCard";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { getDueQuestions, getDueCountsByBox } from "@/db/srs";
import { db } from "@/db/index";
import type { LeitnerBox, SRSState } from "@/types/srs";
import type { Quiz, Question } from "@/types/quiz";
import {
    SRS_REVIEW_QUESTIONS_KEY,
    SRS_REVIEW_QUIZ_ID_KEY,
} from "@/lib/srsReviewStorage";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface CategoryGroup {
    category: string;
    questions: Array<{ srsState: SRSState; question: Question; quiz: Quiz }>;
}

/**
 * Study Due page for reviewing questions via spaced repetition.
 */
export default function StudyDuePage(): React.ReactElement {
    const router = useRouter();
    const { user } = useAuth();
    const effectiveUserId = useEffectiveUserId(user?.id);

    const [isLoading, setIsLoading] = useState(true);
    const [dueCountsByBox, setDueCountsByBox] = useState<Record<LeitnerBox, number>>({
        1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
    });
    const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadDueQuestions = useCallback(async () => {
        if (!effectiveUserId) return;

        setIsLoading(true);
        setError(null);
        try {
            const [counts, dueStates] = await Promise.all([
                getDueCountsByBox(effectiveUserId),
                getDueQuestions(effectiveUserId),
            ]);

            setDueCountsByBox(counts);

            // Load question and quiz data for due questions
            const allQuizzes = await db.quizzes.toArray();

            // Map question IDs to their quiz and question objects
            const groupMap = new Map<string, CategoryGroup>();

            for (const srsState of dueStates) {
                for (const quiz of allQuizzes) {
                    const question = quiz.questions.find((q) => q.id === srsState.question_id);
                    if (question) {
                        const category = question.category || "Uncategorized";
                        if (!groupMap.has(category)) {
                            groupMap.set(category, { category, questions: [] });
                        }
                        groupMap.get(category)!.questions.push({ srsState, question, quiz });
                        break;
                    }
                }
            }

            setCategoryGroups(Array.from(groupMap.values()).sort((a, b) =>
                a.category.localeCompare(b.category)
            ));
        } catch (err) {
            console.error("Failed to load due questions:", err);
            setError("Failed to load review queue. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    }, [effectiveUserId]);

    useEffect(() => {
        void loadDueQuestions();
    }, [loadDueQuestions]);

    const totalDue = Object.values(dueCountsByBox).reduce((sum, count) => sum + count, 0);

    const handleStartReview = useCallback((category?: string) => {
        // For now, navigate to a placeholder - full implementation would launch a filtered quiz
        // This could be integrated with SmartRound or a dedicated SRS quiz mode
        const questionsToReview = category
            ? categoryGroups.find((g) => g.category === category)?.questions ?? []
            : categoryGroups.flatMap((g) => g.questions);

        if (questionsToReview.length === 0) return;

        // Store question IDs in sessionStorage for the quiz page to pick up
        const questionIds = questionsToReview.map((q) => q.question.id);
        const quizId = questionsToReview[0]?.quiz.id;

        if (quizId) {
            sessionStorage.setItem(SRS_REVIEW_QUESTIONS_KEY, JSON.stringify(questionIds));
            sessionStorage.setItem(SRS_REVIEW_QUIZ_ID_KEY, quizId);
            router.push(`/quiz/${quizId}/zen?mode=srs-review`);
        }
    }, [categoryGroups, router]);

    const toggleCategory = useCallback((category: string) => {
        setSelectedCategory((current) => (current === category ? null : category));
    }, []);

    if (!effectiveUserId) {
        return (
            <main className="container mx-auto max-w-4xl px-4 py-8">
                <p className="text-center text-muted-foreground">
                    Please log in to access your review queue.
                </p>
            </main>
        );
    }

    return (
        <main className="container mx-auto max-w-4xl px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <Link
                    href="/"
                    className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Dashboard
                </Link>
                <h1 className="text-3xl font-bold">Spaced Repetition Review</h1>
                <p className="mt-2 text-muted-foreground">
                    Review questions at optimal intervals to maximize retention.
                </p>
            </div>

            {error && (
                <div className="mb-6 rounded-lg bg-destructive/10 p-4 text-destructive" role="alert">
                    {error}
                </div>
            )}

            {isLoading ? (
                <div
                    className="flex items-center justify-center py-12"
                    role="status"
                    aria-label="Loading review queue"
                >
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
            ) : (
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Summary Card */}
                    <div className="lg:col-span-1">
                        <DueQuestionsCard
                            dueCountsByBox={dueCountsByBox}
                            totalDue={totalDue}
                            onStartReview={() => handleStartReview()}
                        />
                    </div>

                    {/* Category Breakdown */}
                    <div className="space-y-4 lg:col-span-2">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">By Category</h2>
                            {totalDue > 0 && (
                                <Button
                                    onClick={() => handleStartReview()}
                                    leftIcon={<Play />}
                                >
                                    Review All ({totalDue})
                                </Button>
                            )}
                        </div>

                        {categoryGroups.length === 0 ? (
                            <Card>
                                <CardContent className="py-8 text-center">
                                    <p className="text-muted-foreground">
                                        No categories with due questions.
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {categoryGroups.map((group) => {
                                    const panelId = `category-panel-${group.category.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}`;
                                    const isExpanded = selectedCategory === group.category;
                                    return (
                                        <Card
                                            key={group.category}
                                            role="button"
                                            tabIndex={0}
                                            aria-expanded={isExpanded}
                                            aria-controls={panelId}
                                            className={cn(
                                                "cursor-pointer transition-all hover:border-primary/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                                                isExpanded && "border-primary"
                                            )}
                                            onClick={() => toggleCategory(group.category)}
                                            onKeyDown={(event) => {
                                                if (event.currentTarget !== event.target) return;
                                                if (event.key === "Enter" || event.key === " ") {
                                                    event.preventDefault();
                                                    toggleCategory(group.category);
                                                }
                                            }}
                                        >
                                            <CardHeader className="pb-2">
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="text-base">
                                                        {group.category}
                                                    </CardTitle>
                                                    <span className="rounded-full bg-primary/10 px-2 py-1 text-sm font-medium text-primary">
                                                        {group.questions.length}
                                                    </span>
                                                </div>
                                            </CardHeader>
                                            {isExpanded && (
                                                <CardContent className="pt-0" id={panelId}>
                                                    <div className="mb-3 text-sm text-muted-foreground">
                                                        {group.questions.length} question{group.questions.length !== 1 ? "s" : ""} due
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleStartReview(group.category);
                                                        }}
                                                        leftIcon={<Filter />}
                                                    >
                                                        Review This Category
                                                    </Button>
                                                </CardContent>
                                            )}
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </main>
    );
}
