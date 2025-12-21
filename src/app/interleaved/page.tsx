"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play, Shuffle, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { useToast } from "@/components/ui/Toast";
import {
    generateInterleavedSession,
    getAvailableCategories,
    getMatchingQuestionCount,
    NoQuestionsError,
} from "@/lib/interleavedPractice";
import { saveInterleavedState } from "@/lib/interleavedStorage";
import { cn } from "@/lib/utils";

const QUESTION_COUNTS = [10, 20, 50] as const;

/**
 * Interleaved Practice selection page.
 * Allows users to configure and start a mixed practice session.
 */
export default function InterleavedPage(): React.ReactElement {
    const router = useRouter();
    const { user } = useAuth();
    const effectiveUserId = useEffectiveUserId(user?.id);
    const { addToast } = useToast();

    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [questionCount, setQuestionCount] = useState<number>(20);
    const [enableRemix, setEnableRemix] = useState(true);
    const [availableQuestions, setAvailableQuestions] = useState<number>(0);

    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState("");

    // Load available categories and question count
    useEffect(() => {
        if (!effectiveUserId) return;

        const load = async (): Promise<void> => {
            setIsLoading(true);
            try {
                const cats = await getAvailableCategories(effectiveUserId);
                setCategories(cats);

                const count = await getMatchingQuestionCount(effectiveUserId, {});
                setAvailableQuestions(count);
            } catch (error) {
                console.error("Failed to load categories:", error);
            } finally {
                setIsLoading(false);
            }
        };

        void load();
    }, [effectiveUserId]);

    // Update available question count when filters change
    useEffect(() => {
        if (!effectiveUserId) return;

        const updateCount = async (): Promise<void> => {
            try {
                const count = await getMatchingQuestionCount(effectiveUserId, {
                    categories: selectedCategories.length > 0 ? selectedCategories : undefined,
                });
                setAvailableQuestions(count);
            } catch {
                setAvailableQuestions(0);
            }
        };

        void updateCount();
    }, [effectiveUserId, selectedCategories]);

    const toggleCategory = useCallback((category: string) => {
        setSelectedCategories((prev) =>
            prev.includes(category)
                ? prev.filter((c) => c !== category)
                : [...prev, category],
        );
    }, []);

    const handleStartPractice = useCallback(async () => {
        if (!effectiveUserId) return;

        setIsGenerating(true);
        setProgress("Collecting questions...");

        try {
            // Small delay for UX feedback
            await new Promise((r) => setTimeout(r, 200));

            const result = await generateInterleavedSession(
                {
                    categories: selectedCategories.length > 0 ? selectedCategories : undefined,
                    questionCount,
                    enableRemix,
                },
                effectiveUserId,
            );

            setProgress(enableRemix ? "Shuffling answers..." : "Preparing session...");
            await new Promise((r) => setTimeout(r, 200));

            setProgress("Preparing session...");
            saveInterleavedState(result.quiz, result.sourceMap, result.keyMappings);

            await new Promise((r) => setTimeout(r, 100));
            router.push("/interleaved/session");
        } catch (error) {
            setIsGenerating(false);
            setProgress("");

            if (error instanceof NoQuestionsError) {
                addToast("error", error.message);
            } else {
                console.error("Failed to generate session:", error);
                addToast("error", "Failed to generate practice session. Please try again.");
            }
        }
    }, [effectiveUserId, selectedCategories, questionCount, enableRemix, router, addToast]);

    if (!effectiveUserId) {
        return (
            <main className="container mx-auto max-w-4xl px-4 py-8">
                <p className="text-center text-muted-foreground">
                    Please log in to access interleaved practice.
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
                <h1 className="text-3xl font-bold">Interleaved Practice</h1>
                <p className="mt-2 text-muted-foreground">
                    Mix questions from multiple quizzes for maximum learning efficacy.
                </p>
            </div>

            {isLoading ? (
                <div
                    className="flex items-center justify-center py-12"
                    role="status"
                    aria-label="Loading"
                >
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
            ) : isGenerating ? (
                <Card>
                    <CardContent className="flex flex-col items-center gap-4 py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-muted-foreground">{progress}</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Configuration */}
                    <div className="space-y-6">
                        {/* Category Filter */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Categories</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {categories.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        No categories available. Import quizzes first.
                                    </p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {categories.map((cat) => (
                                            <button
                                                key={cat}
                                                onClick={() => toggleCategory(cat)}
                                                className={cn(
                                                    "rounded-full px-3 py-1 text-sm font-medium transition-colors",
                                                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                                                    selectedCategories.includes(cat)
                                                        ? "bg-primary text-primary-foreground"
                                                        : "bg-muted text-muted-foreground hover:bg-muted/80",
                                                )}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {selectedCategories.length > 0 && (
                                    <button
                                        onClick={() => setSelectedCategories([])}
                                        className="mt-3 text-sm text-muted-foreground hover:text-foreground"
                                    >
                                        Clear selection
                                    </button>
                                )}
                            </CardContent>
                        </Card>

                        {/* Question Count */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Question Count</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-2">
                                    {QUESTION_COUNTS.map((count) => (
                                        <button
                                            key={count}
                                            onClick={() => setQuestionCount(count)}
                                            className={cn(
                                                "flex-1 rounded-lg px-4 py-3 text-center font-medium transition-colors",
                                                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                                                questionCount === count
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                                            )}
                                        >
                                            {count}
                                        </button>
                                    ))}
                                </div>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    {availableQuestions} questions available
                                    {selectedCategories.length > 0 && " (filtered)"}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Remix Toggle */}
                        <Card>
                            <CardContent className="flex items-center justify-between py-4">
                                <div className="flex items-center gap-3">
                                    <Shuffle className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="font-medium">Remix Mode</p>
                                        <p className="text-sm text-muted-foreground">
                                            Shuffle answer options for each question
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    checked={enableRemix}
                                    onCheckedChange={setEnableRemix}
                                    aria-label="Toggle remix mode"
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Summary & Start */}
                    <div>
                        <Card className="sticky top-4">
                            <CardHeader>
                                <CardTitle className="text-lg">Session Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="rounded-lg bg-muted p-4">
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-muted-foreground">Questions</span>
                                        <span className="text-2xl font-bold">
                                            {Math.min(questionCount, availableQuestions)}
                                        </span>
                                    </div>
                                    {questionCount > availableQuestions && availableQuestions > 0 && (
                                        <p className="mt-1 text-sm text-warning">
                                            Only {availableQuestions} available
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Categories</span>
                                        <span>
                                            {selectedCategories.length === 0
                                                ? "All"
                                                : `${selectedCategories.length} selected`}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Remix Mode</span>
                                        <span>{enableRemix ? "On" : "Off"}</span>
                                    </div>
                                </div>

                                <Button
                                    onClick={handleStartPractice}
                                    disabled={availableQuestions === 0}
                                    className="w-full"
                                    size="lg"
                                    leftIcon={<Play className="h-5 w-5" />}
                                >
                                    Start Practice
                                </Button>

                                {availableQuestions === 0 && (
                                    <p className="text-center text-sm text-muted-foreground">
                                        No questions available. Try adjusting your filters or import
                                        quizzes.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </main>
    );
}
