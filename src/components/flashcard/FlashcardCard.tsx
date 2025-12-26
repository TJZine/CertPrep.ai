"use client";

import * as React from "react";
import { Tag } from "lucide-react";
import type { Question } from "@/types/quiz";
import { cn } from "@/lib/utils";
import styles from "./FlashcardCard.module.css";

export interface FlashcardCardProps {
    /** The question to display */
    question: Question;
    /** Whether the card is flipped to show the answer */
    isFlipped: boolean;
    /** Callback when the card is clicked/flipped */
    onFlip: () => void;
    /** Optional class name */
    className?: string;
}

/**
 * A two-sided flashcard with 3D flip animation.
 * Front: Question text with category badge
 * Back: Correct answer + explanation
 *
 * Supports:
 * - Space key to flip
 * - Click/tap to flip
 * - prefers-reduced-motion (instant flip)
 * - Screen reader announcements
 */
export function FlashcardCard({
    question,
    isFlipped,
    onFlip,
    className,
}: FlashcardCardProps): React.ReactElement {
    const cardRef = React.useRef<HTMLDivElement>(null);

    // Get the correct answer text - options is Record<string, string>
    const correctAnswerText = React.useMemo(() => {
        if (!question.correct_answer) return null;
        return question.options[question.correct_answer] ?? null;
    }, [question.options, question.correct_answer]);

    // Handle keyboard navigation
    const handleKeyDown = React.useCallback(
        (event: React.KeyboardEvent): void => {
            if (event.key === " " || event.key === "Enter") {
                event.preventDefault();
                onFlip();
            }
        },
        [onFlip]
    );

    return (
        <div className={cn(styles.cardContainer, className)}>
            <div
                ref={cardRef}
                className={cn(styles.card, isFlipped && styles.flipped)}
                onClick={onFlip}
                onKeyDown={handleKeyDown}
                role="button"
                tabIndex={0}
                aria-label={isFlipped ? "Flashcard showing answer. Press space to flip back." : "Flashcard showing question. Press space to reveal answer."}
                aria-live="polite"
            >
                {/* Front - Question */}
                <div className={cn(styles.face, styles.front)} aria-hidden={isFlipped}>
                    {question.category && (
                        <div className={styles.categoryBadge}>
                            <Tag className="h-3 w-3" aria-hidden="true" />
                            {question.category}
                        </div>
                    )}
                    <p className={styles.questionText}>{question.question}</p>
                    <div className={styles.flipHint}>
                        <span>Press</span>
                        <kbd>Space</kbd>
                        <span>or click to reveal answer</span>
                    </div>
                </div>

                {/* Back - Answer */}
                <div className={cn(styles.face, styles.back)} aria-hidden={!isFlipped}>
                    {question.category && (
                        <div className={styles.categoryBadge}>
                            <Tag className="h-3 w-3" aria-hidden="true" />
                            {question.category}
                        </div>
                    )}
                    <div className={styles.answerSection}>
                        <span className={styles.answerLabel}>Correct Answer</span>
                        <p className={styles.answerText}>
                            {correctAnswerText ?? "Answer not found"}
                        </p>
                    </div>
                    {question.explanation && (
                        <div className={styles.explanationSection}>
                            <span className={styles.explanationLabel}>Explanation</span>
                            <p className={styles.explanationText}>{question.explanation}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default FlashcardCard;
