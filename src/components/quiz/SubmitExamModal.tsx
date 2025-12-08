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
          <div className="rounded-lg bg-muted p-3 text-center">
            <p className="text-sm text-muted-foreground">
              Time Remaining
            </p>
            <p className="text-2xl font-bold text-foreground">
              {formattedTime}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg border border-border p-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                allAnswered
                  ? "bg-success/10"
                  : "bg-warning/10",
              )}
            >
              {allAnswered ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <HelpCircle className="h-5 w-5 text-warning" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">
                {answeredCount} of {totalQuestions} Answered
              </p>
              <p className="text-sm text-muted-foreground">
                {allAnswered
                  ? "All questions have been answered"
                  : `${unansweredCount} question${unansweredCount !== 1 ? "s" : ""} unanswered`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-border p-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                noFlagged
                  ? "bg-success/10"
                  : "bg-flagged/10",
              )}
            >
              {noFlagged ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <Flag className="h-5 w-5 text-flagged" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">
                {flaggedCount} Flagged for Review
              </p>
              <p className="text-sm text-muted-foreground">
                {noFlagged
                  ? "No questions flagged"
                  : "You marked these to review later"}
              </p>
            </div>
          </div>
        </div>

        {!isReady && (
          <div className="flex items-start gap-3 rounded-lg border border-warning/50 bg-warning/10 p-4">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-warning" />
            <div>
              <p className="font-medium text-warning">
                Are you sure you want to submit?
              </p>
              <p className="mt-1 text-sm text-warning/80">
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
          <div className="flex items-start gap-3 rounded-lg border border-success/50 bg-success/10 p-4">
            <CheckCircle className="h-5 w-5 flex-shrink-0 text-success" />
            <div>
              <p className="font-medium text-success">
                You&apos;re ready to submit!
              </p>
              <p className="mt-1 text-sm text-success/80">
                All questions have been answered and reviewed.
              </p>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
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
      onClose={() => { }}
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
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <p className="text-muted-foreground">
          Your exam time has expired. Your answers have been automatically
          submitted.
        </p>
        <p className="mt-4 text-lg font-semibold text-foreground">
          {answeredCount} of {totalQuestions} questions answered
        </p>
      </div>
    </Modal>
  );
}

export default SubmitExamModal;
