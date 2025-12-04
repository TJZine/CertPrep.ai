"use client";

import * as React from "react";
import { AlertCircle, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { sanitizeHTML } from "@/lib/sanitize";

interface ExplanationPanelProps {
  explanation: string;
  distractorLogic?: string;
  isCorrect: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  className?: string;
}

/**
 * Expandable explanation section with optional distractor details.
 */
export function ExplanationPanel({
  explanation,
  distractorLogic,
  isCorrect,
  isExpanded,
  onToggle,
  className,
}: ExplanationPanelProps): React.ReactElement {
  const contentId = React.useId();
  const sanitizedDistractorLogic = React.useMemo(
    () => (distractorLogic ? sanitizeHTML(distractorLogic) : null),
    [distractorLogic],
  );

  const sanitizedExplanation = React.useMemo(
    () => sanitizeHTML(explanation),
    [explanation],
  );

  return (
    <div className={cn(className)}>
      <Button
        variant="ghost"
        onClick={onToggle}
        className="w-full justify-between"
        aria-expanded={isExpanded}
        aria-controls={contentId}
      >
        <span className="flex items-center gap-2">
          <Lightbulb
            className={cn(
              "h-4 w-4",
              isCorrect ? "text-green-600" : "text-amber-500",
            )}
            aria-hidden="true"
          />
          {isCorrect ? "View Explanation" : "Why is this wrong?"}
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        )}
      </Button>

      <Card
        id={contentId}
        hidden={!isExpanded}
        aria-hidden={!isExpanded}
        className={cn(
          "mt-2",
          isCorrect
            ? "border-green-200 bg-green-50 dark:border-green-800/70 dark:bg-green-900/20"
            : "border-amber-200 bg-amber-50 dark:border-amber-700/70 dark:bg-amber-900/20",
        )}
      >
        <CardContent className="p-4">
          <div className="space-y-4">
            <div>
              <h4
                className={cn(
                  "mb-2 flex items-center gap-2 font-semibold",
                  isCorrect
                    ? "text-green-800 dark:text-green-100"
                    : "text-amber-800 dark:text-amber-100",
                )}
              >
                <Lightbulb className="h-4 w-4" aria-hidden="true" />
                Explanation
              </h4>
              <div
                className={cn(
                  "prose prose-sm max-w-none",
                  isCorrect
                    ? "prose-green dark:prose-invert"
                    : "prose-amber dark:prose-invert",
                )}
                dangerouslySetInnerHTML={{ __html: sanitizedExplanation }}
              />
            </div>

            {!isCorrect && sanitizedDistractorLogic && (
              <div className="border-t border-amber-200 pt-4 dark:border-amber-700/70">
                <h4 className="mb-2 flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-100">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  Why Other Options Are Wrong
                </h4>
                <div
                  className="prose prose-sm prose-amber max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{
                    __html: sanitizedDistractorLogic,
                  }}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ExplanationCompact({
  explanation,
  isCorrect,
  className,
}: {
  explanation: string;
  isCorrect: boolean;
  className?: string;
}): React.ReactElement {
  const sanitizedExplanation = React.useMemo(
    () => sanitizeHTML(explanation),
    [explanation],
  );

  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        isCorrect
          ? "border-green-200 bg-green-50 dark:border-green-800/70 dark:bg-green-900/20"
          : "border-amber-200 bg-amber-50 dark:border-amber-700/70 dark:bg-amber-900/20",
        className,
      )}
    >
      <div
        className={cn(
          "prose prose-sm max-w-none",
          isCorrect
            ? "prose-green dark:prose-invert"
            : "prose-amber dark:prose-invert",
        )}
        dangerouslySetInnerHTML={{ __html: sanitizedExplanation }}
      />
    </div>
  );
}

export default ExplanationPanel;
