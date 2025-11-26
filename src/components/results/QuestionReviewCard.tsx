'use client';

import * as React from 'react';
import { CheckCircle, XCircle, ChevronDown, ChevronUp, Flag, Lightbulb } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AITutorButton } from '@/components/quiz/AITutorButton';
import { cn } from '@/lib/utils';
import { sanitizeHTML } from '@/lib/sanitize';
import type { Question } from '@/types/quiz';

interface QuestionReviewCardProps {
  question: Question;
  questionNumber: number;
  userAnswer: string | null;
  isCorrect: boolean;
  isFlagged: boolean;
  defaultExpanded?: boolean;
  className?: string;
  expandAllState?: boolean;
  expandAllSignal?: number;
}

/**
 * Single question review with collapsible details.
 */
export function QuestionReviewCard({
  question,
  questionNumber,
  userAnswer,
  isCorrect,
  isFlagged,
  defaultExpanded = false,
  className,
  expandAllState,
  expandAllSignal,
}: QuestionReviewCardProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  const sanitizedQuestion = React.useMemo(() => sanitizeHTML(question.question), [question.question]);
  const sanitizedExplanation = React.useMemo(() => sanitizeHTML(question.explanation), [question.explanation]);

  const sortedOptions = React.useMemo(() => {
    return Object.entries(question.options).sort(([a], [b]) => a.localeCompare(b));
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
        'overflow-hidden transition-shadow dark:border-slate-800 dark:bg-slate-900',
        !isCorrect && 'border-l-4 border-l-red-400',
        isCorrect && 'border-l-4 border-l-green-400',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-start gap-4 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
        aria-expanded={isExpanded}
      >
        <div
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
            isCorrect ? 'bg-green-100 dark:bg-green-900/40' : 'bg-red-100 dark:bg-red-900/40',
          )}
        >
          {isCorrect ? (
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-200" aria-hidden="true" />
          ) : (
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-200" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-500 dark:text-slate-300">Q{questionNumber}</span>
            <Badge variant="secondary">{question.category}</Badge>
            {question.difficulty && (
              <Badge
                variant={question.difficulty === 'Easy' ? 'success' : question.difficulty === 'Medium' ? 'warning' : 'danger'}
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

          <p className={cn('text-slate-700 dark:text-slate-100', !isExpanded && 'line-clamp-2')}>
            <span
              dangerouslySetInnerHTML={{
                __html: isExpanded ? sanitizedQuestion : truncatedQuestion,
              }}
            />
          </p>
        </div>

        <div className="flex-shrink-0 text-slate-400 dark:text-slate-300">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-5 w-5" aria-hidden="true" />
          )}
        </div>
      </button>

      {isExpanded && (
        <CardContent className="border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="prose prose-sm prose-slate mb-4 max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: sanitizedQuestion }} />

          <div className="mb-4 space-y-2">
            {sortedOptions.map(([key, text]) => {
              const isUserAnswer = key === userAnswer;
              const isCorrectAnswer = key === question.correct_answer;
              const sanitizedText = sanitizeHTML(text);

              let optionStyle = 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900';
              let badgeContent: React.ReactNode = null;

              if (isCorrectAnswer) {
                optionStyle = 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20';
                badgeContent = (
                  <Badge variant="success" className="ml-2">
                    Correct
                  </Badge>
                );
              } else if (isUserAnswer && !isCorrect) {
                optionStyle = 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20';
                badgeContent = (
                  <Badge variant="danger" className="ml-2">
                    Your Answer
                  </Badge>
                );
              }

              return (
                <div key={key} className={cn('flex items-start gap-3 rounded-lg border p-3', optionStyle)}>
                  <span
                    className={cn(
                      'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium',
                      isCorrectAnswer
                        ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-100'
                        : isUserAnswer && !isCorrect
                          ? 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-100'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100',
                    )}
                  >
                    {key}
                  </span>
                  <span className="flex-1 text-sm text-slate-700 dark:text-slate-100" dangerouslySetInnerHTML={{ __html: sanitizedText }} />
                  {badgeContent}
                </div>
              );
            })}
          </div>

          {!userAnswer && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-700/70 dark:bg-amber-900/20">
              <p className="text-sm text-amber-800 dark:text-amber-100">You did not answer this question.</p>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-2 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" aria-hidden="true" />
              <span className="font-medium text-slate-700 dark:text-slate-100">Explanation</span>
            </div>
            <div className="prose prose-sm prose-slate max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: sanitizedExplanation }} />
          </div>

          {!isCorrect && userAnswer && (
            <div className="mt-4">
              <AITutorButton question={question} userAnswer={userAnswer} variant="compact" />
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default QuestionReviewCard;
