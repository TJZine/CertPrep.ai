'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Home, Printer, RotateCcw, Share2, Trash2 } from 'lucide-react';
import { Scorecard } from './Scorecard';
import { TopicRadar, CategoryBreakdown } from './TopicRadar';
import { ResultsSummary } from './ResultsSummary';
import { QuestionReviewList, type FilterType } from './QuestionReviewList';
import { SmartActions } from './SmartActions';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { deleteResult } from '@/db/results';
import { celebratePerfectScore } from '@/lib/confetti';
import { updateStudyStreak } from '@/lib/streaks';
import { useQuizGrading } from '@/hooks/useQuizGrading';
import { useResolveCorrectAnswers } from '@/hooks/useResolveCorrectAnswers';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import type { Quiz } from '@/types/quiz';
import type { Result } from '@/types/result';

interface ResultsContainerProps {
  result: Result;
  quiz: Quiz;
  previousScore?: number | null;
}

/**
 * Full results page container combining score, analytics, and review.
 */
export function ResultsContainer({ result, quiz, previousScore }: ResultsContainerProps): React.ReactElement {
  const router = useRouter();
  const { addToast } = useToast();

  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const { grading, isLoading: gradingLoading } = useQuizGrading(quiz, result.answers);
  const { resolvedAnswers, isResolving } = useResolveCorrectAnswers(quiz.questions);

  const stats = React.useMemo(() => {
    if (!grading) return null;
    
    return {
      correctCount: grading.correctCount,
      incorrectCount: grading.incorrectCount,
      unansweredCount: grading.unansweredCount,
      answeredCount: Object.keys(result.answers).length,
      averageTimePerQuestion: quiz.questions.length > 0 ? result.time_taken_seconds / quiz.questions.length : 0,
    };
  }, [grading, result.answers, result.time_taken_seconds, quiz.questions.length]);

  const categoryScores = React.useMemo(() => {
    if (!grading) return [];
    
    const categories = new Map<string, { correct: number; total: number }>();

    quiz.questions.forEach((q) => {
      if (!categories.has(q.category)) {
        categories.set(q.category, { correct: 0, total: 0 });
      }

      const cat = categories.get(q.category)!;
      cat.total += 1;

      if (grading.questionStatus[q.id] === true) {
        cat.correct += 1;
      }
    });

    return Array.from(categories.entries()).map(([category, data]) => ({
      category,
      score: Math.round((data.correct / data.total) * 100),
      correct: data.correct,
      total: data.total,
    }));
  }, [quiz, grading]);

  const questionsWithAnswers = React.useMemo(() => {
    if (!grading) return [];
    
    return quiz.questions.map((q) => ({
      question: q,
      userAnswer: result.answers[q.id] || null,
      isCorrect: grading.questionStatus[q.id] === true,
      isFlagged: result.flagged_questions.includes(q.id),
      correctAnswer: resolvedAnswers[q.id] || null,
    }));
  }, [quiz, result, grading, resolvedAnswers]);

  const missedQuestions = React.useMemo(() => {
    if (!grading) return [];
    
    if (isResolving) {
      return [];
    }

    return quiz.questions
      .filter((q) => grading.questionStatus[q.id] !== true && result.answers[q.id]) // Incorrect and answered
      .map((q) => ({
        question: q,
        userAnswer: result.answers[q.id] || null,
        correctAnswer: resolvedAnswers[q.id] || null, // Use null instead of string fallback
      }));
  }, [quiz, result, grading, resolvedAnswers, isResolving]);

  const [questionFilter, setQuestionFilter] = React.useState<FilterType>('all');
  
  const hasSetInitialFilter = React.useRef(false);
  const userHasChangedFilter = React.useRef(false);

  // Update filter once grading is done
  React.useEffect(() => {
    if (!gradingLoading && missedQuestions.length > 0 && !hasSetInitialFilter.current && !userHasChangedFilter.current) {
      setQuestionFilter('incorrect');
      hasSetInitialFilter.current = true;
      addToast('info', 'Showing incorrect answers to help you focus on areas to improve.');
    }
  }, [gradingLoading, missedQuestions.length, addToast]);
  
  const handleFilterChange = (filter: FilterType): void => {
    userHasChangedFilter.current = true;
    setQuestionFilter(filter);
  };

  const handleRetakeQuiz = (): void => {
    router.push(`/quiz/${quiz.id}/${result.mode}`);
  };

  const handleBackToDashboard = (): void => {
    router.push('/');
  };

  const handleDeleteResult = async (): Promise<void> => {
    setIsDeleting(true);

    try {
      await deleteResult(result.id);
      addToast('success', 'Result deleted successfully');
      router.push('/');
    } catch (error) {
      console.error('Failed to delete result:', error);
      addToast('error', 'Failed to delete result');
      setIsDeleting(false);
    }
  };

  const copyToClipboard = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      addToast('success', 'Result copied to clipboard!');
    } catch {
      addToast('error', 'Failed to copy');
    }
  };

  const handleShare = async (): Promise<void> => {
    const shareText = `I scored ${result.score}% on "${quiz.title}" using CertPrep.ai! 🎯`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Quiz Result',
          text: shareText,
        });
        return;
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return;
        }
      }
    }

    await copyToClipboard(shareText);
  };

  const handlePrint = (): void => {
    window.print();
  };

  React.useEffect(() => {
    if (result.score === 100) {
      celebratePerfectScore();
    }
    updateStudyStreak();
  }, [result.score]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {gradingLoading || !stats ? (
         <div className="flex h-screen items-center justify-center">
           <LoadingSpinner size="lg" text="Calculating results..." />
         </div>
      ) : (
        <>
      <header className="no-print sticky top-0 z-40 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon-sm" onClick={handleBackToDashboard} aria-label="Back to dashboard">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Button>
            <div>
              <h1 className="line-clamp-1 text-sm font-semibold text-slate-900 dark:text-slate-50">{quiz.title}</h1>
              <p className="text-xs text-slate-500 dark:text-slate-300">Results</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleShare} leftIcon={<Share2 className="h-4 w-4" aria-hidden="true" />}>
              <span className="hidden sm:inline">Share</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handlePrint} leftIcon={<Printer className="h-4 w-4" aria-hidden="true" />}>
              <span className="hidden sm:inline">Print</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
              className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-300 dark:hover:bg-red-900/40 dark:hover:text-red-100"
              aria-label="Delete result"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="no-print mb-8 flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleBackToDashboard} leftIcon={<Home className="h-4 w-4" aria-hidden="true" />}>
            Dashboard
          </Button>
          <Button onClick={handleRetakeQuiz} leftIcon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}>
            Retake Quiz
          </Button>
        </div>

        <Scorecard
          score={result.score}
          previousScore={previousScore}
          correctCount={stats.correctCount}
          totalCount={quiz.questions.length}
          timeTakenSeconds={result.time_taken_seconds}
          mode={result.mode}
          timestamp={result.timestamp}
          className="mb-8"
        />

        <div className="mb-8 grid gap-8 lg:grid-cols-2">
          <TopicRadar categories={categoryScores} />
          <ResultsSummary
            score={result.score}
            correctCount={stats.correctCount}
            incorrectCount={stats.incorrectCount}
            unansweredCount={stats.unansweredCount}
            flaggedCount={result.flagged_questions.length}
            totalQuestions={quiz.questions.length}
            timeTakenSeconds={result.time_taken_seconds}
            mode={result.mode}
            averageTimePerQuestion={stats.averageTimePerQuestion}
          />
        </div>

        <div className="mb-8 lg:hidden">
          <CategoryBreakdown categories={categoryScores} />
        </div>

        <SmartActions
          quizId={quiz.id}
          quizTitle={quiz.title}
          missedQuestions={missedQuestions}
          flaggedQuestionIds={result.flagged_questions}
          allQuestions={quiz.questions}
          onReviewMissed={() => setQuestionFilter('incorrect')}
          className="mb-8 no-print"
        />

        <div id="question-review" className="print-break">
          <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-slate-50">Question Review</h2>
          <QuestionReviewList
            questions={questionsWithAnswers}
            filter={questionFilter}
            onFilterChange={handleFilterChange}

            isResolving={isResolving}
          />
        </div>
      </main>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Result"
        description="This action cannot be undone."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteResult} isLoading={isDeleting}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to delete this result? Your score and answers will be permanently removed.
        </p>
        <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Score: {result.score}%
        </div>
      </Modal>
      </>
      )}
    </div>
  );
}

export default ResultsContainer;
