"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Brain, Layers, Check, Zap } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export type ReviewMode = "quiz" | "flashcard";

export interface ReviewModeModalProps {
    isOpen: boolean;
    onClose: () => void;
    dueCount: number;
}

interface ReviewModeOption {
    id: ReviewMode;
    name: string;
    description: string;
    icon: React.ReactNode;
    features: string[];
    href: string;
}

const reviewModeOptions: ReviewModeOption[] = [
    {
        id: "quiz",
        name: "Quiz Mode",
        description: "Answer multiple choice questions with scoring",
        icon: <Brain className="h-8 w-8" aria-hidden="true" />,
        features: [
            "Instant answer feedback",
            "Detailed explanations",
            "Spaced repetition controls",
        ],
        href: "/study-due",
    },
    {
        id: "flashcard",
        name: "Flashcard Mode",
        description: "Flip cards and self-rate your confidence",
        icon: <Layers className="h-8 w-8" aria-hidden="true" />,
        features: [
            "Two-sided flip cards",
            "Self-rate difficulty",
            "Keyboard shortcuts",
        ],
        href: "/flashcards/review",
    },
];

/**
 * Modal for selecting review mode (Quiz vs Flashcard) for SRS due questions.
 */
export function ReviewModeModal({
    isOpen,
    onClose,
    dueCount,
}: ReviewModeModalProps): React.ReactElement {
    const router = useRouter();
    const [selectedMode, setSelectedMode] = React.useState<ReviewMode>("quiz");

    const handleStart = (): void => {
        const option = reviewModeOptions.find((o) => o.id === selectedMode);
        if (!option) return;
        onClose();
        router.push(option.href);
    };

    // Reset selection when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setSelectedMode("quiz");
        }
    }, [isOpen]);

    const footer = (
        <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
                Cancel
            </Button>
            <Button
                onClick={handleStart}
                leftIcon={<Zap className="h-4 w-4" aria-hidden="true" />}
            >
                Start {selectedMode === "flashcard" ? "Flashcards" : "Review"}
            </Button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Choose Review Mode"
            description={`${dueCount} question${dueCount !== 1 ? "s" : ""} due for review`}
            size="md"
            footer={footer}
        >
            <div className="grid gap-4 sm:grid-cols-2">
                {reviewModeOptions.map((mode) => (
                    <ReviewModeCard
                        key={mode.id}
                        mode={mode}
                        isSelected={selectedMode === mode.id}
                        onSelect={() => setSelectedMode(mode.id)}
                    />
                ))}
            </div>
        </Modal>
    );
}

function ReviewModeCard({
    mode,
    isSelected,
    onSelect,
}: {
    mode: ReviewModeOption;
    isSelected: boolean;
    onSelect: () => void;
}): React.ReactElement {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={cn(
                "relative flex h-full flex-col rounded-xl border-2 p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary ring-offset-2"
                    : "border-border hover:border-primary/50 hover:bg-muted/50",
            )}
            aria-pressed={isSelected}
        >
            <div
                className={cn(
                    "mb-3 flex h-14 w-14 items-center justify-center rounded-full",
                    isSelected
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                )}
            >
                {mode.icon}
            </div>

            <h3 className="text-lg font-semibold text-foreground">
                {mode.name}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
                {mode.description}
            </p>

            <ul className="mt-3 space-y-1.5">
                {mode.features.map((feature) => (
                    <li
                        key={feature}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                        <Check
                            className="h-3.5 w-3.5 text-correct"
                            aria-hidden="true"
                        />
                        {feature}
                    </li>
                ))}
            </ul>

            <div className="mt-3 flex justify-center">
                <div
                    className={cn(
                        "h-5 w-5 rounded-full border-2",
                        isSelected
                            ? "border-primary bg-primary"
                            : "border-border",
                    )}
                >
                    {isSelected ? (
                        <Check
                            className="h-full w-full p-0.5 text-primary-foreground"
                            aria-hidden="true"
                        />
                    ) : null}
                </div>
            </div>
        </button>
    );
}

export default ReviewModeModal;
