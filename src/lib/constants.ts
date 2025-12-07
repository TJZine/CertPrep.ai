export const APP_NAME = "CertPrep.ai";
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0";

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
    correct: "bg-green-100 border-green-500 text-green-800",
    incorrect: "bg-red-100 border-red-500 text-red-800",
    selected: "bg-blue-100 border-blue-500",
    unseen: "bg-slate-100 border-slate-300",
    flagged: "bg-orange-100 border-orange-500",
  },
} as const;
