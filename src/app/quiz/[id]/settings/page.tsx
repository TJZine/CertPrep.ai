"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, Loader2, Brain } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { useQuiz } from "@/hooks/useDatabase";
import { updateQuiz } from "@/db/quizzes";

/**
 * Quiz settings page for editing category, subcategory, and other metadata.
 */
export default function QuizSettingsPage(): React.ReactElement {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = typeof params?.id === "string" ? params.id : "";
    const { user } = useAuth();
    const effectiveUserId = useEffectiveUserId(user?.id);
    const { addToast } = useToast();

    const { quiz, isLoading } = useQuiz(id, effectiveUserId ?? undefined);

    // Determine back navigation based on entry point
    const getBackUrl = React.useCallback((): string => {
        const from = searchParams?.get("from");
        const resultId = searchParams?.get("resultId");
        if (from === "results" && resultId) {
            return `/results/${resultId}`;
        }
        // Default: go to dashboard
        return "/";
    }, [searchParams]);

    // Form state
    const [title, setTitle] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [category, setCategory] = React.useState("");
    const [subcategory, setSubcategory] = React.useState("");
    const [isSaving, setIsSaving] = React.useState(false);

    // Populate form when quiz loads
    React.useEffect(() => {
        if (quiz) {
            setTitle(quiz.title);
            setDescription(quiz.description ?? "");
            setCategory(quiz.category ?? "");
            setSubcategory(quiz.subcategory ?? "");
        }
    }, [quiz]);

    const handleSave = async (): Promise<void> => {
        if (!effectiveUserId || !quiz) return;

        setIsSaving(true);
        try {
            await updateQuiz(id, effectiveUserId, {
                title: title.trim(),
                description: description.trim(),
                category: category.trim() || undefined,
                subcategory: subcategory.trim() || undefined,
            });
            // useLiveQuery auto-updates when Dexie changes, no manual refresh needed
            addToast("success", "Quiz settings saved");
            router.push(getBackUrl());
        } catch (error) {
            addToast(
                "error",
                error instanceof Error ? error.message : "Failed to save settings",
            );
        } finally {
            setIsSaving(false);
        }
    };

    const hasChanges = quiz && (
        title !== quiz.title ||
        description !== (quiz.description ?? "") ||
        category !== (quiz.category ?? "") ||
        subcategory !== (quiz.subcategory ?? "")
    );

    if (isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <LoadingSpinner size="lg" text="Loading quiz settings..." />
            </div>
        );
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
        <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-6">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(getBackUrl())}
                    className="mb-4 text-muted-foreground hover:text-foreground"
                    leftIcon={<ArrowLeft className="h-4 w-4" />}
                >
                    Back
                </Button>
                <h1 className="text-2xl font-bold text-foreground">Quiz Settings</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Edit quiz metadata and analytics grouping
                </p>
            </div>

            <div className="space-y-6">
                {/* Basic Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label
                                htmlFor="settings-title"
                                className="mb-1 block text-sm font-medium text-foreground"
                            >
                                Title
                            </label>
                            <input
                                id="settings-title"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                maxLength={100}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </div>
                        <div>
                            <label
                                htmlFor="settings-description"
                                className="mb-1 block text-sm font-medium text-foreground"
                            >
                                Description
                            </label>
                            <textarea
                                id="settings-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                maxLength={500}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Analytics Grouping */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Analytics Grouping</CardTitle>
                        <CardDescription>
                            Set category and subcategory to group this quiz in the Topic Heatmap.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label
                                htmlFor="settings-category"
                                className="mb-1 block text-sm font-medium text-foreground"
                            >
                                Category
                            </label>
                            <input
                                id="settings-category"
                                type="text"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                placeholder="e.g., Insurance, Firearms, Custom"
                                maxLength={50}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </div>
                        <div>
                            <label
                                htmlFor="settings-subcategory"
                                className="mb-1 block text-sm font-medium text-foreground"
                            >
                                Subcategory
                            </label>
                            <input
                                id="settings-subcategory"
                                type="text"
                                value={subcategory}
                                onChange={(e) => setSubcategory(e.target.value)}
                                placeholder="e.g., Massachusetts Personal Lines"
                                maxLength={100}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={() => router.push(getBackUrl())}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || !hasChanges || !title.trim()}
                        leftIcon={
                            isSaving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )
                        }
                    >
                        {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </div>
        </main>
    );
}
