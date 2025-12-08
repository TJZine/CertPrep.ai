export const APP_NAME = "CertPrep.ai";
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "1.2.0";

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
    correct: "bg-green-100 border-green-500 text-green-900 dark:bg-green-900/30 dark:border-green-500/50 dark:text-green-100",
    incorrect: "bg-red-100 border-red-500 text-red-900 dark:bg-red-900/30 dark:border-red-500/50 dark:text-red-100",
    selected: "bg-blue-100 border-blue-500 dark:bg-blue-900/30 dark:border-blue-500/50",
    unseen: "bg-slate-100 border-slate-300 dark:bg-slate-800/50 dark:border-slate-700",
    flagged: "bg-orange-100 border-orange-500 dark:bg-orange-900/30 dark:border-orange-500/50",
  },
} as const;
