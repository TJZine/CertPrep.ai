import { beforeEach, describe, expect, it, vi } from "vitest";

import { runSyncPlan, requiresLocalDataPreservation, toSyncDetails } from "@/lib/sync/coordinator";
import {
  failedSyncOutcome,
  skippedSyncOutcome,
  syncedSyncOutcome,
  type SyncRunnerOutcome,
} from "@/lib/sync/shared";

const mockSyncQuizzes = vi.hoisted(() => vi.fn());
const mockSyncResults = vi.hoisted(() => vi.fn());
const mockSyncSRS = vi.hoisted(() => vi.fn());

vi.mock("@/lib/sync/quizSyncManager", () => ({
  syncQuizzes: mockSyncQuizzes,
}));

vi.mock("@/lib/sync/syncManager", () => ({
  syncResults: mockSyncResults,
}));

vi.mock("@/lib/sync/srsSyncManager", () => ({
  syncSRS: mockSyncSRS,
}));

describe("runSyncPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSyncQuizzes.mockResolvedValue(syncedSyncOutcome());
    mockSyncResults.mockResolvedValue(syncedSyncOutcome());
    mockSyncSRS.mockResolvedValue(syncedSyncOutcome());
  });

  it("runs full sync domains in parallel", async () => {
    // The coordinator runs phases: [["quizzes"], ["results", "srs"]]
    // Phase 1: quizzes alone → Phase 2: results + srs in parallel
    const callOrder: string[] = [];

    mockSyncQuizzes.mockImplementation(async () => {
      callOrder.push("quizzes-start");
      callOrder.push("quizzes-end");
      return syncedSyncOutcome();
    });

    // Phase 2 domains use a shared gate to prove they run concurrently
    let openGate!: () => void;
    const gate = new Promise<void>((resolve) => { openGate = resolve; });
    let phase2StartCount = 0;

    const makePhase2Mock = (label: string): (() => Promise<SyncRunnerOutcome>) => async () => {
      callOrder.push(`${label}-start`);
      phase2StartCount++;
      if (phase2StartCount === 2) openGate();
      await gate;
      callOrder.push(`${label}-end`);
      return syncedSyncOutcome();
    };

    mockSyncResults.mockImplementation(makePhase2Mock("results"));
    mockSyncSRS.mockImplementation(makePhase2Mock("srs"));

    await Promise.race([
      runSyncPlan("user-123", "full"),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("phase2 domains did not start in parallel")),
          1000,
        ),
      ),
    ]);

    // Quizzes completed before phase 2 started
    expect(callOrder.indexOf("quizzes-end")).toBeLessThan(callOrder.indexOf("results-start"));
    expect(callOrder.indexOf("quizzes-end")).toBeLessThan(callOrder.indexOf("srs-start"));

    // Phase 2: both started before either ended (proves parallelism)
    const phase2Starts = [callOrder.indexOf("results-start"), callOrder.indexOf("srs-start")];
    const phase2Ends = [callOrder.indexOf("results-end"), callOrder.indexOf("srs-end")];
    expect(Math.max(...phase2Starts)).toBeLessThan(Math.min(...phase2Ends));
  });

  it("limits quiz repair to the quizzes domain", async () => {
    const summary = await runSyncPlan("user-123", "quiz-repair");

    expect(mockSyncQuizzes).toHaveBeenCalledWith("user-123");
    expect(mockSyncResults).not.toHaveBeenCalled();
    expect(mockSyncSRS).not.toHaveBeenCalled();
    expect(summary.domains).toEqual(["quizzes"]);
    expect(summary.outcomes.results).toEqual(skippedSyncOutcome());
    expect(summary.outcomes.srs).toEqual(skippedSyncOutcome());
  });
});

describe("sync coordinator helpers", () => {
  it("treats failed, skipped, or incomplete outcomes as requiring local preservation", () => {
    expect(
      requiresLocalDataPreservation({
        status: "fulfilled",
        value: {
          ...syncedSyncOutcome(),
          incomplete: true,
          shouldRetry: true,
        },
      }),
    ).toBe(true);
    expect(
      requiresLocalDataPreservation({
        status: "fulfilled",
        value: skippedSyncOutcome(),
      }),
    ).toBe(true);
    expect(
      requiresLocalDataPreservation({
        status: "rejected",
        reason: new Error("boom"),
      }),
    ).toBe(true);
  });

  it("maps coordinated outcomes into incomplete detail flags", () => {
    expect(
      toSyncDetails({
        quizzes: syncedSyncOutcome(),
        results: failedSyncOutcome(),
        srs: skippedSyncOutcome(),
      }),
    ).toEqual({
      quizzes: false,
      results: true,
      srs: false,
    });
  });
});
