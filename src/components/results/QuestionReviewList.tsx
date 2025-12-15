"use client";

import * as React from "react";
import { List, CheckCircle, XCircle, Flag } from "lucide-react";
import { QuestionReviewCard } from "./QuestionReviewCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { Question } from "@/types/quiz";

export type FilterType = "all" | "correct" | "incorrect" | "flagged";

interface QuestionWithAnswer {
  question: Question;
  userAnswer: string | null;
  isCorrect: boolean;
  isFlagged: boolean;
  correctAnswer?: string | null;
}

interface QuestionReviewListProps {
  questions: QuestionWithAnswer[];
  filter?: FilterType;
  onFilterChange?: (filter: FilterType) => void;
  categoryFilter?: string | null;
  onCategoryFilterChange?: (category: string | null) => void;
  className?: string;
  isResolving?: boolean;
}

/**
 * Filterable list of question review cards.
 */
export function QuestionReviewList({
  questions,
  filter,
  onFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  className,
  isResolving = false,
}: QuestionReviewListProps): React.ReactElement {
  const [internalFilter, setInternalFilter] = React.useState<FilterType>("all");
  const [expandAll, setExpandAll] = React.useState(false);
  const [expandAllSignal, setExpandAllSignal] = React.useState(0);

  const activeFilter = filter ?? internalFilter;

  const counts = React.useMemo(() => {
    return {
      all: questions.length,
      correct: questions.filter((q) => q.isCorrect).length,
      incorrect: questions.filter((q) => !q.isCorrect).length,
      flagged: questions.filter((q) => q.isFlagged).length,
    };
  }, [questions]);

  const filteredQuestions = React.useMemo(() => {
    let result = questions;

    // Apply category filter first
    if (categoryFilter) {
      result = result.filter((q) => q.question.category === categoryFilter);
    }

    // Then apply status filter
    switch (activeFilter) {
      case "correct":
        return result.filter((q) => q.isCorrect);
      case "incorrect":
        return result.filter((q) => !q.isCorrect);
      case "flagged":
        return result.filter((q) => q.isFlagged);
      default:
        return result;
    }
  }, [questions, activeFilter, categoryFilter]);

  const handleFilterChange = (value: FilterType): void => {
    if (!filter) {
      setInternalFilter(value);
    }
    onFilterChange?.(value);
  };

  const handleToggleExpandAll = (): void => {
    setExpandAll((prev) => !prev);
    setExpandAllSignal((signal) => signal + 1);
  };

  const filters = [
    {
      id: "all",
      label: "All",
      icon: <List className="h-4 w-4" aria-hidden="true" />,
      count: counts.all,
    },
    {
      id: "correct",
      label: "Correct",
      icon: <CheckCircle className="h-4 w-4" aria-hidden="true" />,
      count: counts.correct,
    },
    {
      id: "incorrect",
      label: "Incorrect",
      icon: <XCircle className="h-4 w-4" aria-hidden="true" />,
      count: counts.incorrect,
    },
    {
      id: "flagged",
      label: "Flagged",
      icon: <Flag className="h-4 w-4" aria-hidden="true" />,
      count: counts.flagged,
    },
  ] as const;

  return (
    <div className={className}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <Button
              key={f.id}
              variant={activeFilter === f.id ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange(f.id)}
              className="gap-1.5"
            >
              {f.icon}
              {f.label}
              <Badge
                variant={activeFilter === f.id ? "secondary" : "outline"}
                className="ml-1"
              >
                {f.count}
              </Badge>
            </Button>
          ))}
        </div>

        <Button variant="ghost" size="sm" onClick={handleToggleExpandAll}>
          {expandAll ? "Collapse All" : "Expand All"}
        </Button>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        Showing {filteredQuestions.length} of {questions.length} questions
        {categoryFilter && (
          <>
            {" "}
            in <Badge variant="outline" className="ml-1">{categoryFilter}</Badge>
            <button
              type="button"
              onClick={() => onCategoryFilterChange?.(null)}
              className="ml-2 text-primary hover:underline"
            >
              Clear
            </button>
          </>
        )}
      </p>

      {filteredQuestions.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted p-8 text-center">
          <p className="text-muted-foreground">
            {activeFilter === "incorrect" && "No incorrect answers. Great job!"}
            {activeFilter === "flagged" && "No flagged questions."}
            {activeFilter === "correct" && "No correct answers yet."}
            {activeFilter === "all" && "No questions to display."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map((item) => {
            const originalIndex = questions.findIndex(
              (q) => q.question.id === item.question.id,
            );

            return (
              <QuestionReviewCard
                key={item.question.id}
                question={item.question}
                questionNumber={originalIndex + 1}
                userAnswer={item.userAnswer}
                isFlagged={item.isFlagged}
                defaultExpanded={
                  activeFilter === "incorrect" && !item.isCorrect
                }
                expandAllState={expandAll}
                expandAllSignal={expandAllSignal}
                correctAnswer={item.correctAnswer}
                isResolving={isResolving}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default QuestionReviewList;
