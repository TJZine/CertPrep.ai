import { syncQuizzes, type SyncQuizzesOutcome } from "@/lib/sync/quizSyncManager";
import { syncResults, type SyncResultsOutcome } from "@/lib/sync/syncManager";
import { syncSRS, type SyncSRSOutcome } from "@/lib/sync/srsSyncManager";
import {
  failedSyncOutcome,
  skippedSyncOutcome,
  type SyncRunnerOutcome,
} from "@/lib/sync/shared";

export type SyncDomain = "quizzes" | "results" | "srs";
export type CoordinatedSyncOutcome = SyncRunnerOutcome;

export type SyncPlanName = "full" | "logout" | "quiz-repair";

type SyncRunner = (userId: string) => Promise<SyncRunnerOutcome>;
type SyncPlanSummary = {
  domains: readonly SyncDomain[];
  settlements: Partial<Record<SyncDomain, PromiseSettledResult<CoordinatedSyncOutcome>>>;
  outcomes: Record<SyncDomain, CoordinatedSyncOutcome>;
};

const SYNC_PLAN_DOMAINS: Record<SyncPlanName, readonly SyncDomain[]> = {
  full: ["quizzes", "results", "srs"],
  logout: ["quizzes", "results", "srs"],
  "quiz-repair": ["quizzes"],
};

const SYNC_RUNNERS: Record<SyncDomain, SyncRunner> = {
  quizzes: syncQuizzes,
  results: syncResults,
  srs: syncSRS,
};

const DEFAULT_OUTCOME: Record<SyncDomain, CoordinatedSyncOutcome> = {
  quizzes: skippedSyncOutcome(),
  results: skippedSyncOutcome(),
  srs: skippedSyncOutcome(),
};

const SYNC_PLAN_PHASES: Record<SyncPlanName, readonly (readonly SyncDomain[])[]> = {
  full: [["quizzes"], ["results", "srs"]],
  logout: [["quizzes"], ["results", "srs"]],
  "quiz-repair": [["quizzes"]],
};

function toFailedOutcome(error: unknown): CoordinatedSyncOutcome {
  return failedSyncOutcome({
    error: error instanceof Error ? error.message : String(error),
  });
}

export async function runSyncPlan(
  userId: string,
  plan: SyncPlanName,
): Promise<SyncPlanSummary> {
  const domains = SYNC_PLAN_DOMAINS[plan];
  const domainSettlements: SyncPlanSummary["settlements"] = {};
  const outcomes = { ...DEFAULT_OUTCOME };
  const phases = SYNC_PLAN_PHASES[plan];

  for (const phase of phases) {
    const settlements = await Promise.allSettled(
      phase.map((domain) =>
        SYNC_RUNNERS[domain](userId)
          .then((outcome) => ({ domain, outcome }))
          .catch((error) => Promise.reject({ domain, error })),
      ),
    );

    settlements.forEach((settlement) => {
      if (settlement.status === "fulfilled") {
        const { domain, outcome } = settlement.value;
        domainSettlements[domain] = {
          status: "fulfilled",
          value: outcome,
        };
        outcomes[domain] = outcome;
        return;
      }

      const rejected = settlement.reason as { domain?: SyncDomain; error?: unknown };
      const domain = rejected.domain;
      if (!domain) {
        return;
      }

      const failedOutcome = toFailedOutcome(rejected.error ?? settlement.reason);
      domainSettlements[domain] = {
        status: "rejected",
        reason: settlement.reason,
      };
      outcomes[domain] = failedOutcome;
    });
  }

  return {
    domains,
    settlements: domainSettlements,
    outcomes,
  };
}

export function requiresLocalDataPreservation(
  outcome: PromiseSettledResult<CoordinatedSyncOutcome> | undefined,
): boolean {
  if (!outcome) {
    return false;
  }

  if (outcome.status === "rejected") {
    return true;
  }

  return (
    outcome.value.status === "skipped" ||
    outcome.value.status === "failed" ||
    Boolean(outcome.value.incomplete)
  );
}

export function toSyncDetails(
  outcomes: Record<SyncDomain, CoordinatedSyncOutcome>,
): { quizzes: boolean; results: boolean; srs: boolean } {
  return {
    quizzes: outcomes.quizzes.incomplete,
    results: outcomes.results.incomplete,
    srs: outcomes.srs.incomplete,
  };
}

export type {
  SyncPlanSummary,
  SyncQuizzesOutcome,
  SyncResultsOutcome,
  SyncSRSOutcome,
};
