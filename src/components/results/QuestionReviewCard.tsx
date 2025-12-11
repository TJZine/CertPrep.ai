"use client";

import * as React from "react";
import {
  CheckCircle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Flag,
  HelpCircle,
  Lightbulb,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AITutorButton } from "@/components/quiz/AITutorButton";
import { cn } from "@/lib/utils";
import { sanitizeHTML } from "@/lib/sanitize";
import type { Question } from "@/types/quiz";

interface QuestionReviewCardProps {
  question: Question;
  questionNumber: number;
  userAnswer?: string | null;
  isFlagged: boolean;
  defaultExpanded?: boolean;
  className?: string;
  expandAllState?: boolean;
  expandAllSignal?: number;
  correctAnswer?: string | null;
  isResolving?: boolean;
}

/**
 * Single question review with collapsible details.
 */
export function QuestionReviewCard({
  question,
  questionNumber,
  userAnswer,
  isFlagged,
  defaultExpanded = false,
  className,
  expandAllState,
  expandAllSignal,
  correctAnswer,
  isResolving = false,
}: QuestionReviewCardProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  const sanitizedQuestion = React.useMemo(
    () => sanitizeHTML(question.question),
    [question.question],
  );
  const sanitizedExplanation = React.useMemo(
    () => sanitizeHTML(question.explanation),
    [question.explanation],
  );

  // Determine the canonical correct answer (prefer prop, fallback to question data)
  const canonicalCorrectAnswer = correctAnswer || question.correct_answer;
  const hasCanonicalAnswer = !!canonicalCorrectAnswer;
  const hasUserAnswer = userAnswer != null && userAnswer !== "";

  // Compute correctness based on the canonical answer
  const isCorrect =
    hasCanonicalAnswer &&
    hasUserAnswer &&
    userAnswer.trim() === canonicalCorrectAnswer.trim();
  const isWrong = hasCanonicalAnswer && hasUserAnswer && !isCorrect;

  // Determine what to display for the correct answer
  let correctAnswerDisplay = canonicalCorrectAnswer;
  const correctAnswerKey = canonicalCorrectAnswer;

  const showResolutionError =
    !canonicalCorrectAnswer && !isResolving && !!question.correct_answer_hash;

  if (!correctAnswerDisplay && isResolving) {
    correctAnswerDisplay = "Resolving...";
  } else if (!correctAnswerDisplay && !!question.correct_answer_hash) {
    correctAnswerDisplay = "Unable to resolve";
  }

  const sortedOptions = React.useMemo(() => {
    return Object.entries(question.options).sort(([a], [b]) =>
      a.localeCompare(b),
    );
  }, [question.options]);

  const truncatedQuestion = React.useMemo(() => {
    if (sanitizedQuestion.length <= 150) return sanitizedQuestion;
    return `${sanitizedQuestion.substring(0, 150)}...`;
  }, [sanitizedQuestion]);

  React.useEffect(() => {
    if (expandAllState !== undefined && expandAllSignal !== undefined) {
      setIsExpanded(expandAllState);
    }
  }, [expandAllSignal, expandAllState]);

  return (
    <Card
      className={cn(
        "overflow-hidden transition-shadow border-border bg-card",
        isWrong && "border-l-4 border-l-incorrect",
        isCorrect && "border-l-4 border-l-correct",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-start gap-4 p-4 text-left hover:bg-muted/50"
        aria-expanded={isExpanded}
      >
        <div
          className={cn(
            "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
            isCorrect
              ? "bg-correct/10"
              : isWrong
                ? "bg-incorrect/10"
                : "bg-muted",
          )}
        >
          {isCorrect ? (
            <CheckCircle
              className="h-5 w-5 text-correct"
              aria-hidden="true"
            />
          ) : isWrong ? (
            <XCircle
              className="h-5 w-5 text-incorrect"
              aria-hidden="true"
            />
          ) : (
            <HelpCircle
              className="h-5 w-5 text-muted-foreground"
              aria-hidden="true"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="font-medium text-muted-foreground">
              Q{questionNumber}
            </span>
            <Badge variant="secondary">{question.category}</Badge>
            {question.difficulty && (
              <Badge
                variant={
                  question.difficulty === "Easy"
                    ? "success"
                    : question.difficulty === "Medium"
                      ? "warning"
                      : "danger"
                }
              >
                {question.difficulty}
              </Badge>
            )}
            {isFlagged && (
              <Badge variant="warning" className="gap-1">
                <Flag className="h-3 w-3" aria-hidden="true" />
                Flagged
              </Badge>
            )}
          </div>

          <p
            className={cn(
              "text-foreground",
              !isExpanded && "line-clamp-2",
            )}
          >
            <span
              dangerouslySetInnerHTML={{
                __html: isExpanded ? sanitizedQuestion : truncatedQuestion,
              }}
            />
          </p>
        </div>

        <div className="flex-shrink-0 text-muted-foreground">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-5 w-5" aria-hidden="true" />
          )}
        </div>
      </button>

      {isExpanded && (
        <CardContent className="border-t border-border pt-4">
          <div
            className="prose prose-sm max-w-none text-foreground"
            dangerouslySetInnerHTML={{ __html: sanitizedQuestion }}
          />

          {showResolutionError && (
            <div className="mb-4 rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm text-warning">
              Unable to determine the correct answer from stored quiz data.
            </div>
          )}

          <div className="mb-4 space-y-2">
            {sortedOptions.map(([key, text]) => {
              const isUserAnswer = key === userAnswer;
              const isCorrectAnswer = key === correctAnswerKey;
              const sanitizedText = sanitizeHTML(text);

              let optionStyle =
                "border-border bg-card";
              let badgeContent: React.ReactNode = null;

              if (isCorrectAnswer) {
                optionStyle =
                  "border-correct/50 bg-correct/10";
                badgeContent = (
                  <Badge variant="success" className="ml-2">
                    Correct
                  </Badge>
                );
              } else if (isUserAnswer && !isCorrect) {
                optionStyle =
                  "border-incorrect/50 bg-incorrect/10";
                badgeContent = (
                  <Badge variant="danger" className="ml-2">
                    Your Answer
                  </Badge>
                );
              }

              return (
                <div
                  key={key}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3",
                    optionStyle,
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium",
                      isCorrectAnswer
                        ? "bg-correct/20 text-correct"
                        : isUserAnswer && !isCorrect
                          ? "bg-incorrect/20 text-incorrect"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {key}
                  </span>
                  <span
                    className="flex-1 text-sm text-foreground"
                    dangerouslySetInnerHTML={{ __html: sanitizedText }}
                  />
                  {badgeContent}
                </div>
              );
            })}
          </div>

          {/* Correct Answer (if wrong) */}
          {isWrong && correctAnswerDisplay && (
            <div className="mt-3 p-3 bg-correct/10 border border-correct/30 rounded-md">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-correct mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium text-correct block mb-1">
                    Correct Answer:
                  </span>
                  <span className="text-correct">
                    {correctAnswerDisplay}
                  </span>
                </div>
              </div>
            </div>
          )}
          {!hasUserAnswer && (
            <div className="mb-4 rounded-lg border border-warning/50 bg-warning/10 p-3">
              <p className="text-sm text-warning">
                You did not answer this question.
              </p>
            </div>
          )}

          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Lightbulb
                className="h-4 w-4 text-warning"
                aria-hidden="true"
              />
              <span className="font-medium text-foreground">
                Explanation
              </span>
            </div>
            <div
              className="prose prose-sm max-w-none text-foreground"
              dangerouslySetInnerHTML={{ __html: sanitizedExplanation }}
            />
          </div>

          {!isCorrect && hasUserAnswer && (
            <div className="mt-4">
              <AITutorButton
                question={question}
                userAnswer={userAnswer}
                variant="compact"
              />
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default QuestionReviewCard;
