import { beforeEach, describe, expect, it, vi } from "vitest";

import { runSyncPlan, requiresLocalDataPreservation, toSyncDetails } from "@/lib/sync/coordinator";

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

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe("runSyncPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSyncQuizzes.mockResolvedValue({ incomplete: false, status: "synced" });
    mockSyncResults.mockResolvedValue({ incomplete: false, status: "synced" });
    mockSyncSRS.mockResolvedValue({ incomplete: false });
  });

  it("waits for quizzes to settle before starting results and srs during full sync", async () => {
    const callOrder: string[] = [];
    const quizDeferred = createDeferred<{ incomplete: false; status: "synced" }>();
    const resultsDeferred = createDeferred<{ incomplete: false; status: "synced" }>();
    const srsDeferred = createDeferred<{ incomplete: false }>();

    mockSyncQuizzes.mockImplementation(async () => {
      callOrder.push("quizzes-start");
      const outcome = await quizDeferred.promise;
      callOrder.push("quizzes-end");
      return outcome;
    });
    mockSyncResults.mockImplementation(async () => {
      callOrder.push("results-start");
      const outcome = await resultsDeferred.promise;
      callOrder.push("results-end");
      return outcome;
    });
    mockSyncSRS.mockImplementation(async () => {
      callOrder.push("srs-start");
      const outcome = await srsDeferred.promise;
      callOrder.push("srs-end");
      return outcome;
    });

    const runPromise = runSyncPlan("user-123", "full");

    await Promise.resolve();
    expect(callOrder).toEqual(["quizzes-start"]);
    expect(mockSyncResults).not.toHaveBeenCalled();
    expect(mockSyncSRS).not.toHaveBeenCalled();

    quizDeferred.resolve({ incomplete: false, status: "synced" });
    await vi.waitFor(() =>
      expect(callOrder).toEqual([
        "quizzes-start",
        "quizzes-end",
        "results-start",
        "srs-start",
      ]),
    );

    resultsDeferred.resolve({ incomplete: false, status: "synced" });
    srsDeferred.resolve({ incomplete: false });

    await runPromise;

    expect(callOrder.indexOf("quizzes-end")).toBeLessThan(callOrder.indexOf("results-start"));
    expect(callOrder.indexOf("quizzes-end")).toBeLessThan(callOrder.indexOf("srs-start"));
  });

  it("waits for quizzes to settle before starting results and srs during logout sync", async () => {
    const callOrder: string[] = [];
    const quizDeferred = createDeferred<{ incomplete: false; status: "synced" }>();
    const resultsDeferred = createDeferred<{ incomplete: false; status: "synced" }>();
    const srsDeferred = createDeferred<{ incomplete: false }>();

    mockSyncQuizzes.mockImplementation(async () => {
      callOrder.push("quizzes-start");
      const outcome = await quizDeferred.promise;
      callOrder.push("quizzes-end");
      return outcome;
    });
    mockSyncResults.mockImplementation(async () => {
      callOrder.push("results-start");
      const outcome = await resultsDeferred.promise;
      callOrder.push("results-end");
      return outcome;
    });
    mockSyncSRS.mockImplementation(async () => {
      callOrder.push("srs-start");
      const outcome = await srsDeferred.promise;
      callOrder.push("srs-end");
      return outcome;
    });

    const runPromise = runSyncPlan("user-123", "logout");

    await Promise.resolve();
    expect(callOrder).toEqual(["quizzes-start"]);
    expect(mockSyncResults).not.toHaveBeenCalled();
    expect(mockSyncSRS).not.toHaveBeenCalled();

    quizDeferred.resolve({ incomplete: false, status: "synced" });
    await vi.waitFor(() =>
      expect(callOrder).toEqual([
        "quizzes-start",
        "quizzes-end",
        "results-start",
        "srs-start",
      ]),
    );

    resultsDeferred.resolve({ incomplete: false, status: "synced" });
    srsDeferred.resolve({ incomplete: false });

    await runPromise;
  });

  it.each([
    [
      "returns incomplete",
      async (): Promise<{
        incomplete: true;
        status: "failed";
        shouldRetry: true;
      }> =>
        ({
          incomplete: true,
          status: "failed" as const,
          shouldRetry: true,
        }),
    ],
    [
      "rejects",
      async (): Promise<never> => {
        throw new Error("quiz sync failed");
      },
    ],
  ])(
    "still runs results after the quiz phase settles when quiz sync %s",
    async (_label, runQuizSync) => {
      const callOrder: string[] = [];
      const resultsDeferred = createDeferred<{ incomplete: false; status: "synced" }>();
      const srsDeferred = createDeferred<{ incomplete: false }>();

      mockSyncQuizzes.mockImplementation(async () => {
        callOrder.push("quizzes-start");
        try {
          return await runQuizSync();
        } finally {
          callOrder.push("quizzes-end");
        }
      });
      mockSyncResults.mockImplementation(async () => {
        callOrder.push("results-start");
        const outcome = await resultsDeferred.promise;
        callOrder.push("results-end");
        return outcome;
      });
      mockSyncSRS.mockImplementation(async () => {
        callOrder.push("srs-start");
        const outcome = await srsDeferred.promise;
        callOrder.push("srs-end");
        return outcome;
      });

      const runPromise = runSyncPlan("user-123", "full");

      await vi.waitFor(() =>
        expect(callOrder).toEqual([
          "quizzes-start",
          "quizzes-end",
          "results-start",
          "srs-start",
        ]),
      );
      expect(mockSyncResults).toHaveBeenCalledWith("user-123");
      expect(mockSyncSRS).toHaveBeenCalledWith("user-123");

      resultsDeferred.resolve({ incomplete: false, status: "synced" });
      srsDeferred.resolve({ incomplete: false });

      const summary = await runPromise;

      expect(summary.outcomes.results.status).toBe("synced");
      expect(summary.outcomes.srs.incomplete).toBe(false);
    },
  );

  it("limits quiz repair to the quizzes domain", async () => {
    const summary = await runSyncPlan("user-123", "quiz-repair");

    expect(mockSyncQuizzes).toHaveBeenCalledWith("user-123");
    expect(mockSyncResults).not.toHaveBeenCalled();
    expect(mockSyncSRS).not.toHaveBeenCalled();
    expect(summary.domains).toEqual(["quizzes"]);
    expect(summary.outcomes.results.status).toBe("skipped");
    expect(summary.outcomes.srs.status).toBe("skipped");
  });
});

describe("sync coordinator helpers", () => {
  it("treats failed, skipped, or incomplete outcomes as requiring local preservation", () => {
    expect(
      requiresLocalDataPreservation({
        status: "fulfilled",
        value: { incomplete: true, status: "synced" },
      }),
    ).toBe(true);
    expect(
      requiresLocalDataPreservation({
        status: "fulfilled",
        value: { incomplete: false, status: "skipped" },
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
        quizzes: { incomplete: false, status: "synced" },
        results: { incomplete: true, status: "failed" },
        srs: { incomplete: false, status: "skipped" },
      }),
    ).toEqual({
      quizzes: false,
      results: true,
      srs: false,
    });
  });
});
