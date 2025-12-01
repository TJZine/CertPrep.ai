'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { QuizLayout } from './QuizLayout';
import { QuestionDisplay } from './QuestionDisplay';
import { ProctorOptionsList } from './ProctorOptionsList';
import { ProctorControls } from './ProctorControls';
import { QuestionNavGrid, QuestionNavStrip } from './QuestionNavGrid';
import { SubmitExamModal, TimeUpModal } from './SubmitExamModal';
import { Card, CardContent } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import {
  useCurrentQuestion,
  useProctorStatus,
  useQuestionStatuses,
  useQuizSessionStore,
} from '@/stores/quizSessionStore';
import { useKeyboardNav } from '@/hooks/useKeyboardNav';
import { useTimer } from '@/hooks/useTimer';
import { useBeforeUnload } from '@/hooks/useBeforeUnload';
import { createResult } from '@/db/results';
import { TIMER } from '@/lib/constants';
import type { Quiz } from '@/types/quiz';
import { useSync } from '@/hooks/useSync';
import { useAuth } from '@/components/providers/AuthProvider';
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId';

interface ProctorQuizContainerProps {
  quiz: Quiz;
  durationMinutes?: number;
}

/**
 * Main orchestrator for Proctor exam mode.
 */
export function ProctorQuizContainer({
  quiz,
  durationMinutes = TIMER.DEFAULT_EXAM_DURATION_MINUTES,
}: ProctorQuizContainerProps): React.ReactElement {
  const router = useRouter();
  const { addToast } = useToast();
  const { sync } = useSync();
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId(user?.id);

  const hasSavedResultRef = React.useRef(false);

  const {
    initializeProctorSession,
    selectAnswerProctor,
    navigateToQuestion,
    goToNextQuestion,
    goToPreviousQuestion,
    toggleFlag,
    updateTimeRemaining,
    submitExam,
    autoSubmitExam,
    resetSession,
    currentIndex,
    selectedAnswer,
    flaggedQuestions,
    answers,
    isComplete,
  } = useQuizSessionStore();

  const currentQuestion = useCurrentQuestion();
  const proctorStatus = useProctorStatus();
  const questionStatuses = useQuestionStatuses();

  const [showSubmitModal, setShowSubmitModal] = React.useState(false);
  const [showTimeUpModal, setShowTimeUpModal] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [autoResultId, setAutoResultId] = React.useState<string | null>(null);
  const autoSubmitRef = React.useRef<() => Promise<string | null> | null>(null);

  const { seconds: timeRemaining, formattedTime, start: startTimer, pause: pauseTimer } = useTimer({
    initialSeconds: durationMinutes * 60,
    countDown: true,
    autoStart: false,
    onComplete: () => {
      void autoSubmitRef.current?.();
    },
  });
  useBeforeUnload(!isComplete, 'Your quiz progress will be lost. Are you sure?');

  React.useEffect((): void => {
    updateTimeRemaining(timeRemaining);
  }, [timeRemaining, updateTimeRemaining]);

  React.useEffect((): (() => void) => {
    initializeProctorSession(quiz.id, quiz.questions, durationMinutes);
    startTimer();
    hasSavedResultRef.current = false;
    return () => {
      pauseTimer();
      resetSession();
      hasSavedResultRef.current = false;
    };
  }, [quiz.id, quiz.questions, durationMinutes, initializeProctorSession, startTimer, pauseTimer, resetSession]);

  useKeyboardNav({
    onNext: goToNextQuestion,
    onPrevious: goToPreviousQuestion,
    onSelectOption: (key) => {
      if (currentQuestion?.options[key]) {
        selectAnswerProctor(key);
      }
    },
    onFlag: () => {
      if (currentQuestion) {
        toggleFlag(currentQuestion.id);
      }
    },
    enabled: !isComplete && !showSubmitModal && !showTimeUpModal,
    optionKeys: currentQuestion ? Object.keys(currentQuestion.options) : [],
  });

  const buildAnswersRecord = React.useCallback((): Record<string, string> => {
    const answersRecord: Record<string, string> = {};
    answers.forEach((record, questionId) => {
      answersRecord[questionId] = record.selectedAnswer;
    });
    return answersRecord;
  }, [answers]);

  const handleSubmitExam = async (): Promise<void> => {
    if (isSubmitting || hasSavedResultRef.current) return;
    setIsSubmitting(true);
    setShowSubmitModal(false);
    try {
      pauseTimer();
      submitExam();
      if (!effectiveUserId) {
        addToast('error', 'Unable to save results: no user context available.');
        setIsSubmitting(false);
        return;
      }

      const result = await createResult({
        quizId: quiz.id,
        userId: effectiveUserId,
        mode: 'proctor',
        answers: buildAnswersRecord(),
        flaggedQuestions: Array.from(flaggedQuestions),
        timeTakenSeconds: durationMinutes * 60 - timeRemaining,
      });
      hasSavedResultRef.current = true;
      void sync();
      addToast('success', 'Exam submitted successfully!');
      router.push(`/results/${result.id}`);
    } catch (error) {
      console.error('Failed to submit exam:', error);
      addToast('error', 'Failed to submit exam. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleAutoSubmit = React.useCallback(async (): Promise<string | null> => {
    if (isSubmitting || hasSavedResultRef.current) {
      return autoResultId;
    }
    setIsSubmitting(true);
    pauseTimer();
    autoSubmitExam();
    try {
      if (!effectiveUserId) {
        addToast('error', 'Unable to save results: no user context available.');
        setIsSubmitting(false);
        return null;
      }

      const result = await createResult({
        quizId: quiz.id,
        userId: effectiveUserId,
        mode: 'proctor',
        answers: buildAnswersRecord(),
        flaggedQuestions: Array.from(flaggedQuestions),
        timeTakenSeconds: durationMinutes * 60,
      });
      hasSavedResultRef.current = true;
      setAutoResultId(result.id);
      void sync();
      setShowTimeUpModal(true);
      return result.id;
    } catch (error) {
      console.error('Failed to auto-submit exam:', error);
      addToast('error', 'Auto-submit failed. Please submit manually.');
      setShowSubmitModal(true);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [addToast, autoResultId, autoSubmitExam, buildAnswersRecord, durationMinutes, effectiveUserId, flaggedQuestions, isSubmitting, pauseTimer, quiz.id, sync]);

  React.useEffect(() => {
    autoSubmitRef.current = handleAutoSubmit;
  }, [handleAutoSubmit]);

  const handleTimeUpConfirm = async (): Promise<void> => {
    setIsSubmitting(true);
    try {
      const resultId = autoResultId ?? (await handleAutoSubmit());
      if (resultId) {
        router.push(`/results/${resultId}`);
      }
    } catch (error) {
      console.error('Failed to save results:', error);
      addToast('error', 'Failed to save results. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExit = (): void => {
    pauseTimer();
    resetSession();
    router.push('/');
  };

  const navItems = React.useMemo(
    () =>
      questionStatuses.map((q, index) => ({
        id: q.id,
        index,
        status: q.status,
      })),
    [questionStatuses],
  );

  const hasCurrentAnswer = currentQuestion ? answers.has(currentQuestion.id) : false;

  if (!currentQuestion) {
    return (
      <QuizLayout
        title={quiz.title}
        currentProgress={proctorStatus.answeredCount}
        totalQuestions={proctorStatus.totalQuestions}
        timerDisplay={formattedTime}
        timerWarning={proctorStatus.isTimeWarning}
        onExit={handleExit}
        mode="proctor"
      >
        <div className="py-12 text-center">
          <p className="text-slate-500">Loading question...</p>
        </div>
      </QuizLayout>
    );
  }

  const sidebarContent = (
    <QuestionNavGrid questions={navItems} currentIndex={currentIndex} onNavigate={navigateToQuestion} />
  );

  return (
    <>
      <QuizLayout
        title={quiz.title}
        currentProgress={proctorStatus.answeredCount}
        totalQuestions={proctorStatus.totalQuestions}
        timerDisplay={formattedTime}
        timerWarning={proctorStatus.isTimeWarning}
        onExit={handleExit}
        showExitConfirm
        mode="proctor"
        sidebar={sidebarContent}
      >
        <div className="mx-auto w-full max-w-3xl min-w-0 overflow-x-hidden">
          <div className="mb-4 lg:hidden">
            <QuestionNavStrip questions={navItems} currentIndex={currentIndex} onNavigate={navigateToQuestion} />
          </div>

          <Card className="w-full overflow-hidden">
            <CardContent className="w-full overflow-x-auto p-6 sm:p-8">
              <QuestionDisplay
                question={currentQuestion}
                questionNumber={currentIndex + 1}
                totalQuestions={quiz.questions.length}
                isFlagged={flaggedQuestions.has(currentQuestion.id)}
                onToggleFlag={() => toggleFlag(currentQuestion.id)}
                showFlagButton
              />

              <div className="mt-6">
                <ProctorOptionsList
                  options={currentQuestion.options}
                  selectedAnswer={selectedAnswer}
                  onSelectOption={selectAnswerProctor}
                />
              </div>

              <div className="mt-8">
                <ProctorControls
                  currentIndex={currentIndex}
                  totalQuestions={quiz.questions.length}
                  isFlagged={flaggedQuestions.has(currentQuestion.id)}
                  hasAnswer={hasCurrentAnswer}
                  onPrevious={goToPreviousQuestion}
                  onNext={goToNextQuestion}
                  onToggleFlag={() => toggleFlag(currentQuestion.id)}
                  onSubmitExam={() => setShowSubmitModal(true)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </QuizLayout>

      <SubmitExamModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onConfirm={handleSubmitExam}
        totalQuestions={proctorStatus.totalQuestions}
        answeredCount={proctorStatus.answeredCount}
        unansweredCount={proctorStatus.unansweredCount}
        flaggedCount={proctorStatus.flaggedCount}
        isSubmitting={isSubmitting}
        timeRemaining={timeRemaining}
      />

      <TimeUpModal
        isOpen={showTimeUpModal}
        onConfirm={handleTimeUpConfirm}
        answeredCount={proctorStatus.answeredCount}
        totalQuestions={proctorStatus.totalQuestions}
        isSubmitting={isSubmitting}
      />
    </>
  );
}

export default ProctorQuizContainer;
