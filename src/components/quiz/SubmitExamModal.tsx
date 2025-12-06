"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle,
  Flag,
  HelpCircle,
  Send,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface SubmitExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  flaggedCount: number;
  isSubmitting?: boolean;
  timeRemaining?: number;
}

/**
 * Confirmation modal shown before submitting an exam.
 */
export function SubmitExamModal({
  isOpen,
  onClose,
  onConfirm,
  totalQuestions,
  answeredCount,
  unansweredCount,
  flaggedCount,
  isSubmitting = false,
  timeRemaining,
}: SubmitExamModalProps): React.ReactElement {
  const allAnswered = unansweredCount === 0;
  const noFlagged = flaggedCount === 0;
  const isReady = allAnswered && noFlagged;

  const formattedTime = React.useMemo(() => {
    if (timeRemaining === undefined) return null;
    const mins = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, [timeRemaining]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Submit Exam?"
      description="Please review before submitting your exam."
      size="md"
      closeOnOverlayClick={!isSubmitting}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Continue Reviewing
          </Button>
          <Button
            variant={isReady ? "success" : "default"}
            onClick={onConfirm}
            isLoading={isSubmitting}
            leftIcon={<Send className="h-4 w-4" />}
          >
            Submit Exam
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {formattedTime && (
          <div className="rounded-lg bg-slate-100 p-3 text-center dark:bg-slate-800">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Time Remaining
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {formattedTime}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                allAnswered
                  ? "bg-green-100 dark:bg-green-900/40"
                  : "bg-amber-100 dark:bg-amber-900/40",
              )}
            >
              {allAnswered ? (
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-200" />
              ) : (
                <HelpCircle className="h-5 w-5 text-amber-600 dark:text-amber-200" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {answeredCount} of {totalQuestions} Answered
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-300">
                {allAnswered
                  ? "All questions have been answered"
                  : `${unansweredCount} question${unansweredCount !== 1 ? "s" : ""} unanswered`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                noFlagged
                  ? "bg-green-100 dark:bg-green-900/40"
                  : "bg-orange-100 dark:bg-orange-900/40",
              )}
            >
              {noFlagged ? (
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-200" />
              ) : (
                <Flag className="h-5 w-5 text-orange-600 dark:text-orange-200" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {flaggedCount} Flagged for Review
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-300">
                {noFlagged
                  ? "No questions flagged"
                  : "You marked these to review later"}
              </p>
            </div>
          </div>
        </div>

        {!isReady && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/60 dark:bg-amber-950">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-200" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Are you sure you want to submit?
              </p>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-200">
                {!allAnswered ? (
                  <>
                    You have {unansweredCount} unanswered question
                    {unansweredCount !== 1 ? "s" : ""}.{" "}
                  </>
                ) : null}
                {!noFlagged ? (
                  <>
                    You have {flaggedCount} flagged question
                    {flaggedCount !== 1 ? "s" : ""} you may want to review.
                  </>
                ) : null}
              </p>
            </div>
          </div>
        )}

        {isReady && (
          <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-500/60 dark:bg-green-950">
            <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-200" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">
                You&apos;re ready to submit!
              </p>
              <p className="mt-1 text-sm text-green-700 dark:text-green-200">
                All questions have been answered and reviewed.
              </p>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-500 dark:text-slate-300">
          Once submitted, you cannot change your answers.
        </p>
      </div>
    </Modal>
  );
}

interface TimeUpModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  answeredCount: number;
  totalQuestions: number;
  isSubmitting?: boolean;
}

/**
 * Modal displayed when timer reaches zero.
 */
export function TimeUpModal({
  isOpen,
  onConfirm,
  answeredCount,
  totalQuestions,
  isSubmitting = false,
}: TimeUpModalProps): React.ReactElement {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      title="Time's Up!"
      size="sm"
      closeOnOverlayClick={false}
      footer={
        <Button
          variant="default"
          onClick={onConfirm}
          isLoading={isSubmitting}
          className="w-full"
        >
          View Results
        </Button>
      }
    >
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
          <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-200" />
        </div>
        <p className="text-slate-600 dark:text-slate-200">
          Your exam time has expired. Your answers have been automatically
          submitted.
        </p>
        <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          {answeredCount} of {totalQuestions} questions answered
        </p>
      </div>
    </Modal>
  );
}

export default SubmitExamModal;
