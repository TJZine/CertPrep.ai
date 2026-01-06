"use client";

import * as React from "react";
import { RotateCcw, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export type FlashcardRating = 1 | 2 | 3;

export interface FlashcardControlsProps {
    /** Callback when user rates the card */
    onRate: (rating: FlashcardRating) => void;
    /** Whether controls are disabled (e.g., during transition) */
    disabled?: boolean;
    /** Optional class name */
    className?: string;
}

/**
 * Rating buttons shown after revealing a flashcard answer.
 * Forgot (1) = Demote to box 1
 * Hard (2) = Stay in current box
 * Good (3) = Promote one box
 *
 * Keyboard shortcuts: 1/2/3 or F/H/G
 */
export function FlashcardControls({
    onRate,
    disabled = false,
    className,
}: FlashcardControlsProps): React.ReactElement {
    // Handle keyboard shortcuts
    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent): void => {
            if (disabled) return;

            switch (event.key.toLowerCase()) {
                case "1":
                case "a": // Legacy support
                case "f":
                    event.preventDefault();
                    onRate(1);
                    break;
                case "2":
                case "h":
                    event.preventDefault();
                    onRate(2);
                    break;
                case "3":
                case "g":
                    event.preventDefault();
                    onRate(3);
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return (): void => window.removeEventListener("keydown", handleKeyDown);
    }, [onRate, disabled]);

    return (
        <div
            className={cn(
                "flex flex-col gap-3 w-full max-w-md mx-auto",
                className
            )}
            role="group"
            aria-label="Rate how well you knew this answer"
        >
            <p className="text-center text-sm text-muted-foreground mb-1">
                How well did you know this?
            </p>
            <div className="grid grid-cols-3 gap-2">
                <Button
                    variant="outline"
                    onClick={() => onRate(1)}
                    disabled={disabled}
                    className="flex-col h-auto py-3 border-destructive/50 hover:bg-destructive/10 hover:border-destructive focus-visible:ring-destructive"
                    aria-label="Forgot - I failed this, reset progress"
                >
                    <RotateCcw className="h-5 w-5 mb-1 text-destructive" aria-hidden="true" />
                    <span className="font-medium text-destructive">Forgot</span>
                    <kbd className="text-[10px] text-muted-foreground mt-1 opacity-70">1</kbd>
                </Button>

                <Button
                    variant="outline"
                    onClick={() => onRate(2)}
                    disabled={disabled}
                    className="flex-col h-auto py-3 border-warning/50 hover:bg-warning/10 hover:border-warning focus-visible:ring-warning"
                    aria-label="Hard - I knew this but it was difficult"
                >
                    <ChevronRight className="h-5 w-5 mb-1 text-warning" aria-hidden="true" />
                    <span className="font-medium text-warning">Hard</span>
                    <kbd className="text-[10px] text-muted-foreground mt-1 opacity-70">2</kbd>
                </Button>

                <Button
                    variant="outline"
                    onClick={() => onRate(3)}
                    disabled={disabled}
                    className="flex-col h-auto py-3 border-correct/50 hover:bg-correct/10 hover:border-correct focus-visible:ring-correct"
                    aria-label="Good - I knew this well"
                >
                    <Check className="h-5 w-5 mb-1 text-correct" aria-hidden="true" />
                    <span className="font-medium text-correct">Good</span>
                    <kbd className="text-[10px] text-muted-foreground mt-1 opacity-70">3</kbd>
                </Button>
            </div>
        </div>
    );
}

export default FlashcardControls;
