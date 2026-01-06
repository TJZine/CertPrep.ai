export const APP_NAME = "CertPrep.ai";
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "1.4.1";

export const NIL_UUID = "00000000-0000-0000-0000-000000000000";



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

export const LOCAL_STORAGE_KEYS = {
  DASHBOARD_SORT_BY: "dashboard-sort-by",
  /** Suffix for user-scoped quiz count key: `dashboard_{userId}_quiz_count` */
  DASHBOARD_QUIZ_COUNT_SUFFIX: "_quiz_count",
  /** Suffix for user-scoped SRS dues flag key: `dashboard_{userId}_has_srs_dues` */
  DASHBOARD_HAS_SRS_DUES_SUFFIX: "_has_srs_dues",
} as const;

/** Build a user-scoped localStorage key for dashboard caching */
export function buildDashboardCacheKey(
  userId: string,
  type: "quiz_count" | "has_srs_dues"
): string {
  const suffix = type === "quiz_count"
    ? LOCAL_STORAGE_KEYS.DASHBOARD_QUIZ_COUNT_SUFFIX
    : LOCAL_STORAGE_KEYS.DASHBOARD_HAS_SRS_DUES_SUFFIX;
  return `dashboard_${userId}${suffix}`;
}
