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
  const buttonId = React.useId();
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
        id={buttonId}
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
              isCorrect ? "text-correct" : "text-warning",
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
        role="region"
        aria-labelledby={buttonId}
        hidden={!isExpanded}
        className={cn(
          "mt-2",
          isCorrect
            ? "border-correct/50 bg-correct/10"
            : "border-warning/50 bg-warning/10",
        )}
      >
        <CardContent className="p-4">
          <div className="space-y-4">
            <div>
              <h4
                className={cn(
                  "mb-2 flex items-center gap-2 font-semibold",
                  isCorrect
                    ? "text-correct"
                    : "text-warning",
                )}
              >
                <Lightbulb className="h-4 w-4" aria-hidden="true" />
                Explanation
              </h4>
              <div
                className="prose prose-sm max-w-none text-foreground"
                dangerouslySetInnerHTML={{ __html: sanitizedExplanation }}
              />
            </div>

            {!isCorrect && sanitizedDistractorLogic && (
              <div className="border-t border-warning/30 pt-4">
                <h4 className="mb-2 flex items-center gap-2 font-semibold text-warning">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  Why Other Options Are Wrong
                </h4>
                <div
                  className="prose prose-sm max-w-none text-foreground"
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
          ? "border-correct/50 bg-correct/10"
          : "border-warning/50 bg-warning/10",
        className,
      )}
    >
      <div
        className="prose prose-sm max-w-none text-foreground"
        dangerouslySetInnerHTML={{ __html: sanitizedExplanation }}
      />
    </div>
  );
}

export default ExplanationPanel;
