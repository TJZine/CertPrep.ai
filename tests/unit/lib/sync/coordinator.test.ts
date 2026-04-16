import { beforeEach, describe, expect, it, vi } from "vitest";

import { runSyncPlan, requiresLocalDataPreservation, toSyncDetails } from "@/lib/sync/coordinator";
import {
  failedSyncOutcome,
  skippedSyncOutcome,
  syncedSyncOutcome,
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
    const callOrder: string[] = [];
    mockSyncQuizzes.mockImplementation(async () => {
      callOrder.push("quizzes-start");
      await new Promise((resolve) => setTimeout(resolve, 10));
      callOrder.push("quizzes-end");
      return syncedSyncOutcome();
    });
    mockSyncResults.mockImplementation(async () => {
      callOrder.push("results-start");
      await new Promise((resolve) => setTimeout(resolve, 10));
      callOrder.push("results-end");
      return syncedSyncOutcome();
    });
    mockSyncSRS.mockImplementation(async () => {
      callOrder.push("srs-start");
      await new Promise((resolve) => setTimeout(resolve, 10));
      callOrder.push("srs-end");
      return syncedSyncOutcome();
    });

    await runSyncPlan("user-123", "full");

    const startIndices = [
      callOrder.indexOf("quizzes-start"),
      callOrder.indexOf("results-start"),
      callOrder.indexOf("srs-start"),
    ];
    const endIndices = [
      callOrder.indexOf("quizzes-end"),
      callOrder.indexOf("results-end"),
      callOrder.indexOf("srs-end"),
    ];

    expect(Math.max(...startIndices)).toBeLessThan(Math.min(...endIndices));
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
