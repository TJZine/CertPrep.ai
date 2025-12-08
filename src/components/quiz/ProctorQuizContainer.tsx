"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { QuizLayout } from "./QuizLayout";
import { QuestionDisplay } from "./QuestionDisplay";
import { ProctorOptionsList } from "./ProctorOptionsList";
import { ProctorControls } from "./ProctorControls";
import { QuestionNavGrid, QuestionNavStrip } from "./QuestionNavGrid";
import { SubmitExamModal, TimeUpModal } from "./SubmitExamModal";
import { Card, CardContent } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import {
  useCurrentQuestion,
  useProctorStatus,
  useQuestionStatuses,
  useQuizSessionStore,
} from "@/stores/quizSessionStore";
import { useKeyboardNav } from "@/hooks/useKeyboardNav";
import { useTimer } from "@/hooks/useTimer";
import { useBeforeUnload } from "@/hooks/useBeforeUnload";
import { TIMER } from "@/lib/constants";
import type { Quiz } from "@/types/quiz";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { useExamSubmission } from "@/hooks/useExamSubmission";

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
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId(user?.id);

  // Removed unused ref definition

  const {
    initializeProctorSession,
    selectAnswerProctor,
    navigateToQuestion,
    goToNextQuestion,
    goToPreviousQuestion,
    toggleFlag,
    updateTimeRemaining,
    resetSession,
    currentIndex,
    selectedAnswer,
    flaggedQuestions,
    answers,
    isComplete,
    error,
    clearError,
  } = useQuizSessionStore();

  const currentQuestion = useCurrentQuestion();
  const proctorStatus = useProctorStatus();
  const questionStatuses = useQuestionStatuses();

  // Timer must be declared before submission hook
  const {
    seconds: timeRemaining,
    formattedTime,
    start: startTimer,
    pause: pauseTimer,
  } = useTimer({
    initialSeconds: durationMinutes * 60,
    countDown: true,
    autoStart: false,
    onComplete: () => {
      void autoSubmitRef.current?.();
    },
  });

  const {
    isSubmitting,
    showSubmitModal,
    setShowSubmitModal,
    showTimeUpModal,
    handleSubmitExam,
    handleAutoSubmit,
    handleTimeUpConfirm,
  } = useExamSubmission({
    quiz,
    effectiveUserId,
    durationMinutes,
    timeRemaining,
    pauseTimer,
    answers,
    flaggedQuestions,
  });

  const autoSubmitRef = React.useRef<() => Promise<string | null> | null>(null);

  React.useEffect(() => {
    autoSubmitRef.current = handleAutoSubmit;
  }, [handleAutoSubmit]);

  useBeforeUnload(
    !isComplete,
    "Your quiz progress will be lost. Are you sure?",
  );

  React.useEffect(() => {
    if (error) {
      addToast("error", error);
      clearError();
    }
  }, [error, addToast, clearError]);

  React.useEffect((): void => {
    updateTimeRemaining(timeRemaining);
  }, [timeRemaining, updateTimeRemaining]);

  React.useEffect((): (() => void) => {
    initializeProctorSession(quiz.id, quiz.questions, durationMinutes);
    startTimer();
    return () => {
      pauseTimer();
      resetSession();
    };
  }, [
    quiz.id,
    quiz.questions,
    durationMinutes,
    initializeProctorSession,
    startTimer,
    pauseTimer,
    resetSession,
  ]);

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

  const handleExit = (): void => {
    pauseTimer();
    resetSession();
    router.push("/");
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

  const hasCurrentAnswer = currentQuestion
    ? answers.has(currentQuestion.id)
    : false;

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
          <p className="text-muted-foreground">Loading question...</p>
        </div>
      </QuizLayout>
    );
  }

  const sidebarContent = (
    <QuestionNavGrid
      questions={navItems}
      currentIndex={currentIndex}
      onNavigate={navigateToQuestion}
    />
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
            <QuestionNavStrip
              questions={navItems}
              currentIndex={currentIndex}
              onNavigate={navigateToQuestion}
            />
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
