"use client";

import * as React from "react";
import { Flag, FlagOff } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { sanitizeHTML } from "@/lib/sanitize";
import { cn } from "@/lib/utils";
import type { Question } from "@/types/quiz";

interface QuestionDisplayProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  isFlagged: boolean;
  onToggleFlag: () => void;
  showFlagButton?: boolean;
  className?: string;
}

/**
 * Renders the question stem with metadata and flag controls.
 */
export function QuestionDisplay({
  question,
  questionNumber,
  totalQuestions,
  isFlagged,
  onToggleFlag,
  showFlagButton = true,
  className,
}: QuestionDisplayProps): React.ReactElement {
  const sanitizedQuestion = React.useMemo(
    () => sanitizeHTML(question.question),
    [question.question],
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Question {questionNumber} of {totalQuestions}
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
        </div>
        {showFlagButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleFlag}
            className={cn(isFlagged && "text-flagged hover:text-flagged/80")}
            aria-label={isFlagged ? "Remove flag" : "Flag for review"}
            aria-pressed={isFlagged}
          >
            {isFlagged ? (
              <Flag className="h-4 w-4 fill-current" />
            ) : (
              <FlagOff className="h-4 w-4" />
            )}
            <span className="ml-1 hidden sm:inline">
              {isFlagged ? "Flagged" : "Flag"}
            </span>
          </Button>
        )}
      </div>

      <div
        className="question-text prose max-w-none break-words text-foreground"
        dangerouslySetInnerHTML={{ __html: sanitizedQuestion }}
        aria-label="Question text"
      />

      {question.user_notes && (
        <div className="rounded-lg border border-info/30 bg-info/10 p-3">
          <p className="text-xs font-medium text-info">
            Your Notes:
          </p>
          <p className="mt-1 text-sm text-foreground">
            {question.user_notes}
          </p>
        </div>
      )}
    </div>
  );
}

export default QuestionDisplay;
