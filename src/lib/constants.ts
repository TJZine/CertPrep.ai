export const APP_NAME = "CertPrep.ai";
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "1.4.1";

export const NIL_UUID = "00000000-0000-0000-0000-000000000000";

export const SPACED_REPETITION = {
  AGAIN_REAPPEAR_TURNS: 3,
  HARD_FLAG: "needs_review",
} as const;

export const TIMER = {
  WARNING_THRESHOLD_SECONDS: 300,
  DEFAULT_EXAM_DURATION_MINUTES: 60,
} as const;

export const QUESTION_STATUS = {
  UNSEEN: "unseen",
  ANSWERED: "answered",
  FLAGGED: "flagged",
} as const;

export const THEME = {
  colors: {
    correct: "bg-correct/10 border-correct",
    incorrect: "bg-incorrect/10 border-incorrect",
    selected: "bg-primary/10 border-primary",
    unseen: "bg-muted border-border",
    flagged: "bg-flagged/10 border-flagged",
  },
} as const;
