'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Brain, Check, RotateCcw, Sparkles, Target, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import {
  SMART_ROUND_QUESTIONS_KEY,
  SMART_ROUND_QUIZ_ID_KEY,
  SMART_ROUND_ALL_QUESTIONS_KEY,
  SMART_ROUND_MISSED_COUNT_KEY,
  SMART_ROUND_FLAGGED_COUNT_KEY,
} from '@/lib/smartRoundStorage';
import type { Question } from '@/types/quiz';

interface MissedQuestion {
  question: Question;
  userAnswer: string | null;
  correctAnswer: string | null;
}

interface SmartActionsProps {
  quizId: string;
  quizTitle: string;
  missedQuestions: MissedQuestion[];
  flaggedQuestionIds: string[];
  allQuestions: Question[];
  onReviewMissed?: () => void;
  className?: string;
}

/**
 * Smart follow-up actions for results: review missed, AI plan, smart round.
 */
export function SmartActions({
  quizId,
  quizTitle,
  missedQuestions,
  flaggedQuestionIds,
  allQuestions,
  onReviewMissed,
  className,
}: SmartActionsProps): React.ReactElement {
  const router = useRouter();
  const { addToast } = useToast();

  const [copied, setCopied] = React.useState(false);
  const [showSmartRoundModal, setShowSmartRoundModal] = React.useState(false);

  const hasMissedQuestions = missedQuestions.length > 0;
  const hasFlaggedQuestions = flaggedQuestionIds.length > 0;

  const flaggedAndMissed = React.useMemo(() => {
    const missedIds = new Set(missedQuestions.map((q) => q.question.id));
    return flaggedQuestionIds.filter((id) => missedIds.has(id));
  }, [missedQuestions, flaggedQuestionIds]);

  const smartRoundQuestionIds = React.useMemo(() => {
    const ids = new Set<string>();
    missedQuestions.forEach((q) => ids.add(q.question.id));
    flaggedQuestionIds.forEach((id) => ids.add(id));
    return Array.from(ids);
  }, [missedQuestions, flaggedQuestionIds]);

  const generateStudyPlanPrompt = (): string => {
    const categoryGroups = new Map<string, MissedQuestion[]>();

    missedQuestions.forEach((q) => {
      const category = q.question.category;
      if (!categoryGroups.has(category)) {
        categoryGroups.set(category, []);
      }
      categoryGroups.get(category)!.push(q);
    });

    let prompt = `I'm studying for "${quizTitle}" and need help understanding the concepts I got wrong.\n\n`;
    prompt += '## Summary\n';
    prompt += `- Total questions missed: ${missedQuestions.length}\n`;
    prompt += `- Categories needing review: ${categoryGroups.size}\n\n`;
    prompt += '## Questions I Got Wrong\n\n';

    categoryGroups.forEach((questions, category) => {
      prompt += `### ${category} (${questions.length} missed)\n\n`;

      questions.forEach((q, index) => {
        const userAnswerText = q.userAnswer ? q.question.options[q.userAnswer] : 'No answer provided';
        const correctAnswerText = q.correctAnswer ? q.question.options[q.correctAnswer] : 'Unknown';

        prompt += `**Question ${index + 1}:** ${q.question.question}\n`;
        prompt += `- My Answer: ${q.userAnswer ? `${q.userAnswer}) ${userAnswerText}` : 'N/A - No answer provided'}\n`;
        prompt += `- Correct Answer: ${q.correctAnswer ? `${q.correctAnswer}) ${correctAnswerText}` : 'Unknown'}\n\n`;
      });
    });

    prompt += '## What I Need\n';
    prompt += '1. Explain why my answers were wrong for each question\n';
    prompt += '2. Help me understand the underlying concepts\n';
    prompt += '3. Provide memory techniques or mnemonics where helpful\n';
    prompt += '4. Give me a focused study plan to improve in these areas\n';
    prompt += '5. Suggest related topics I should also review\n';

    return prompt;
  };

  const handleCopyStudyPlan = async (): Promise<void> => {
    const prompt = generateStudyPlanPrompt();

    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      addToast('success', 'Study plan prompt copied! Paste it into ChatGPT, Claude, or your favorite AI.');
      window.setTimeout(() => setCopied(false), 3000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = prompt;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();

      try {
        document.execCommand('copy');
        setCopied(true);
        addToast('success', 'Study plan prompt copied!');
        window.setTimeout(() => setCopied(false), 3000);
      } catch {
        addToast('error', 'Failed to copy. Please try again.');
      } finally {
        document.body.removeChild(textArea);
      }
    }
  };

  const handleStartSmartRound = (): void => {
    sessionStorage.setItem(SMART_ROUND_QUESTIONS_KEY, JSON.stringify(smartRoundQuestionIds));
    sessionStorage.setItem(SMART_ROUND_QUIZ_ID_KEY, quizId);
    sessionStorage.setItem(SMART_ROUND_ALL_QUESTIONS_KEY, JSON.stringify(allQuestions.map((q) => q.id)));
    sessionStorage.setItem(SMART_ROUND_MISSED_COUNT_KEY, String(missedQuestions.length));
    sessionStorage.setItem(SMART_ROUND_FLAGGED_COUNT_KEY, String(flaggedQuestionIds.length));

    router.push(`/quiz/${quizId}/zen?mode=smart`);
    setShowSmartRoundModal(false);
  };

  const handleReviewMissed = (): void => {
    onReviewMissed?.();
    const reviewSection = document.getElementById('question-review');
    if (reviewSection) {
      reviewSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" aria-hidden="true" />
            Smart Actions
          </CardTitle>
          <CardDescription className="dark:text-slate-300">AI-powered tools to improve your weak areas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <button
              type="button"
              onClick={handleReviewMissed}
              disabled={!hasMissedQuestions}
              className={cn(
                'flex flex-col items-center rounded-lg border-2 border-dashed p-6 text-center transition-colors',
                hasMissedQuestions
                  ? 'border-slate-300 hover:border-blue-400 hover:bg-blue-50 dark:border-slate-600 dark:hover:border-blue-500 dark:hover:bg-blue-900/20'
                  : 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed dark:border-slate-700 dark:bg-slate-900',
              )}
            >
              <div className="mb-3 rounded-full bg-red-100 p-3 dark:bg-red-900/40">
                <Target className="h-6 w-6 text-red-600 dark:text-red-200" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Review Missed</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                {hasMissedQuestions ? `${missedQuestions.length} questions to review` : 'No missed questions!'}
              </p>
            </button>

            <button
              type="button"
              onClick={handleCopyStudyPlan}
              disabled={!hasMissedQuestions}
              className={cn(
                'flex flex-col items-center rounded-lg border-2 border-dashed p-6 text-center transition-colors',
                hasMissedQuestions
                  ? 'border-slate-300 hover:border-purple-400 hover:bg-purple-50 dark:border-slate-600 dark:hover:border-purple-500 dark:hover:bg-purple-900/20'
                  : 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed dark:border-slate-700 dark:bg-slate-900',
              )}
            >
              <div className="mb-3 rounded-full bg-purple-100 p-3 dark:bg-purple-900/40">
                {copied ? (
                  <Check className="h-6 w-6 text-purple-600 dark:text-purple-200" aria-hidden="true" />
                ) : (
                  <Brain className="h-6 w-6 text-purple-600 dark:text-purple-200" aria-hidden="true" />
                )}
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{copied ? 'Copied!' : 'AI Study Plan'}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                {hasMissedQuestions ? 'Generate prompt for AI tutor' : 'No areas need improvement!'}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setShowSmartRoundModal(true)}
              disabled={smartRoundQuestionIds.length === 0}
              className={cn(
                'flex flex-col items-center rounded-lg border-2 border-dashed p-6 text-center transition-colors',
                smartRoundQuestionIds.length > 0
                  ? 'border-slate-300 hover:border-green-400 hover:bg-green-50 dark:border-slate-600 dark:hover:border-green-500 dark:hover:bg-green-900/20'
                  : 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed dark:border-slate-700 dark:bg-slate-900',
              )}
            >
              <div className="mb-3 rounded-full bg-green-100 p-3 dark:bg-green-900/40">
                <RotateCcw className="h-6 w-6 text-green-600 dark:text-green-200" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Smart Round</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                {smartRoundQuestionIds.length > 0
                  ? `Practice ${smartRoundQuestionIds.length} questions`
                  : 'No questions to retry!'}
              </p>
            </button>
          </div>

          {!hasMissedQuestions && !hasFlaggedQuestions && (
            <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-center dark:border-green-800/70 dark:bg-green-900/20">
              <p className="font-medium text-green-800 dark:text-green-100">🎉 Perfect score! No areas need improvement.</p>
              <p className="mt-1 text-sm text-green-600 dark:text-green-200">
                Try a harder quiz or take another attempt to test your consistency.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={showSmartRoundModal}
        onClose={() => setShowSmartRoundModal(false)}
        title="Start Smart Round"
        description="Practice only the questions you need to review"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowSmartRoundModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartSmartRound} rightIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}>
              Start Practice
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h4 className="font-medium text-slate-900">Questions Included:</h4>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                {missedQuestions.length} missed questions
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-orange-400" />
                {flaggedQuestionIds.length} flagged questions
              </li>
              {flaggedAndMissed.length > 0 && (
                <li className="text-xs text-slate-400">({flaggedAndMissed.length} overlap - counted once)</li>
              )}
            </ul>
            <p className="mt-3 font-semibold text-slate-900">Total: {smartRoundQuestionIds.length} questions</p>
          </div>

          <p className="text-sm text-slate-500">
            This will start a new Zen study session with only the questions you need to practice. Perfect for focused
            review!
          </p>
        </div>
      </Modal>
    </>
  );
}

export default SmartActions;
