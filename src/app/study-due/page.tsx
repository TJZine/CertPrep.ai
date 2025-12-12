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

    const loadDueQuestions = useCallback(async () => {
        if (!effectiveUserId) return;

        setIsLoading(true);
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
        } catch (error) {
            console.error("Failed to load due questions:", error);
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
            sessionStorage.setItem("srsReviewQuestions", JSON.stringify(questionIds));
            sessionStorage.setItem("srsReviewQuizId", quizId);
            router.push(`/quiz/${quizId}?mode=srs-review`);
        }
    }, [categoryGroups, router]);

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

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
            ) : (
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Summary Card */}
                    <div className="lg:col-span-1">
                        <DueQuestionsCard
                            dueCountsByBox={dueCountsByBox}
                            totalDue={totalDue}
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
                                {categoryGroups.map((group) => (
                                    <Card
                                        key={group.category}
                                        className={cn(
                                            "cursor-pointer transition-all hover:border-primary/50",
                                            selectedCategory === group.category && "border-primary"
                                        )}
                                        onClick={() =>
                                            setSelectedCategory(
                                                selectedCategory === group.category
                                                    ? null
                                                    : group.category
                                            )
                                        }
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
                                        {selectedCategory === group.category && (
                                            <CardContent className="pt-0">
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
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </main>
    );
}
