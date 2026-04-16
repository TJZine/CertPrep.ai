import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { db, clearDatabase } from "@/db";
import { syncResults } from "@/lib/sync/syncManager";
import { readAndRepairResultsSyncCursor } from "@/db/syncState";
import { logger } from "@/lib/logger";
import { Quiz } from "@/types/quiz";
import { Result } from "@/types/result";

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// Mock logger to avoid noise
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock shared utilities
vi.mock("@/lib/sync/shared", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    // Disable caching for tests so each test can provide its own mock client
    createSupabaseClientGetter:
      (factory: () => unknown): (() => unknown) =>
      () =>
        factory(),
  };
});

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

describe("Sync Manager: results", () => {
  const userId = "user-123";

  beforeEach(async () => {
    await clearDatabase();
    vi.clearAllMocks();

    // Stub Globals
    vi.stubGlobal("performance", {
      mark: vi.fn(),
      measure: vi.fn(),
    });

    const mockNavigator = {
      onLine: true,
      locks: {
        request: vi.fn(
          async (
            name: string,
            _options: unknown,
            callback: (lock: unknown) => Promise<unknown>,
          ) => {
            logger.debug(`[Test] navigator.locks.request called for ${name}`);
            try {
              const result = await callback({ name });
              logger.debug(
                `[Test] navigator.locks.request callback SUCCESS for ${name}`,
              );
              return result;
            } catch (e) {
              logger.error(
                `[Test] navigator.locks.request callback ERROR for ${name}:`,
                e,
              );
              throw e;
            }
          },
        ),
      },
    };
    vi.stubGlobal("navigator", mockNavigator);

    // Default auth mock: success
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });

    // Default resolved values for terminal Supabase calls
    mockSupabase.limit.mockResolvedValue({ data: [], error: null });
    mockSupabase.upsert.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should skip sync if offline", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const result = await syncResults(userId);
    expect(result.incomplete).toBe(true);
    expect(result.status).toBe("skipped");
    expect(result.error).toBe("Offline");
    expect(result.shouldRetry).toBe(true);
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining("Browser is offline"),
    );
  });

  it("should skip sync if not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Session expired" } as unknown as Error,
    });

    const outcome = await syncResults(userId);
    expect(outcome.status).toBe("skipped");
    expect(outcome.error).toBe("Not authenticated");
    expect(outcome.shouldRetry).toBe(true);
  });

  it("should return an explicit skipped outcome when another tab holds the lock", async () => {
    const lockRequest = vi
      .fn()
      .mockImplementation(async (_name, _options, callback) => callback(null));
    vi.stubGlobal("navigator", {
      onLine: true,
      locks: { request: lockRequest },
    });

    const outcome = await syncResults(userId);

    expect(outcome).toEqual({
      incomplete: false,
      status: "skipped",
      error: null,
      shouldRetry: true,
    });
  });

  it("should return an explicit failed outcome when the Web Locks request resolves without an outcome", async () => {
    vi.stubGlobal("navigator", {
      onLine: true,
      locks: {
        request: vi.fn().mockResolvedValue(undefined),
      },
    });

    const outcome = await syncResults(userId);

    expect(outcome).toEqual({
      incomplete: true,
      status: "failed",
      error: "Results sync lock request returned no outcome",
      shouldRetry: true,
    });
  });

  it("should return an explicit failed outcome when lock acquisition throws", async () => {
    vi.stubGlobal("navigator", {
      onLine: true,
      locks: {
        request: vi.fn().mockRejectedValue(new Error("lock failed")),
      },
    });

    const outcome = await syncResults(userId);

    expect(outcome.incomplete).toBe(true);
    expect(outcome.status).toBe("failed");
    expect(outcome.error).toContain("lock failed");
    expect(outcome.shouldRetry).toBe(true);
  });

  it("reports skipped overlap when the fallback sync guard is already active", async () => {
    const authDeferred = createDeferred<{
      data: { user: { id: string } };
      error: null;
    }>();
    mockSupabase.auth.getUser.mockReturnValueOnce(authDeferred.promise);
    vi.stubGlobal("navigator", { onLine: true });

    const firstSync = syncResults(userId);
    await vi.waitFor(() =>
      expect(mockSupabase.auth.getUser).toHaveBeenCalledTimes(1),
    );

    const overlappedOutcome = await syncResults(userId);

    expect(overlappedOutcome).toEqual({
      incomplete: false,
      status: "skipped",
      shouldRetry: true,
    });

    authDeferred.resolve({
      data: { user: { id: userId } },
      error: null,
    });
    await firstSync;
  });

  it("reports failed outcome when requesting the results sync lock throws", async () => {
    const lockRequest = vi.fn().mockRejectedValue(new Error("lock exploded"));
    vi.stubGlobal("navigator", {
      onLine: true,
      locks: { request: lockRequest },
    });

    const outcome = await syncResults(userId);

    expect(outcome).toEqual({
      incomplete: true,
      status: "failed",
      error: "Failed to acquire sync lock request",
      shouldRetry: true,
    });
  });

  describe("Push Phase", () => {
    it("should push unsynced results to Supabase", async () => {
      const quizId = "quiz-1";
      await db.quizzes.add({
        id: quizId,
        user_id: userId,
        title: "Test Quiz",
        last_synced_at: Date.now(),
      } as unknown as Quiz);

      await db.results.add({
        id: "res-1",
        user_id: userId,
        quiz_id: quizId,
        synced: 0,
        score: 100,
        timestamp: Date.now(),
        mode: "zen",
      } as unknown as Result);

      const outcome = await syncResults(userId);

      expect(mockSupabase.from).toHaveBeenCalledWith("results");
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: "res-1" })]),
        { onConflict: "id" },
      );

      const local = await db.results.get("res-1");
      expect(local?.synced).toBe(1);
      expect(outcome.status).toBe("synced");
    });

    it("should skip results if the quiz hasn't synced (FK Pre-Flight)", async () => {
      await db.quizzes.add({
        id: "unsynced-quiz",
        user_id: userId,
        last_synced_at: null,
      } as unknown as Quiz);

      await db.results.add({
        id: "res-skipped",
        user_id: userId,
        quiz_id: "unsynced-quiz",
        synced: 0,
      } as unknown as Result);

      await syncResults(userId);

      expect(mockSupabase.upsert).not.toHaveBeenCalled();

      const local = await db.results.get("res-skipped");
      expect(local?.synced).toBe(0);
    });
  });

  describe("Pull Phase", () => {
    it("should pull remote results and save locally", async () => {
      const remoteRecord = {
        id: "remote-res-1",
        quiz_id: "q1",
        timestamp: Date.now(),
        mode: "zen",
        score: 85,
        time_taken_seconds: 120,
        answers: { q1: "a" },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      };

      mockSupabase.limit.mockResolvedValue({
        data: [remoteRecord],
        error: null,
      });

      await syncResults(userId);

      const local = await db.results.get("remote-res-1");
      expect(local).toBeDefined();
      expect(local?.score).toBe(85);
      expect(local?.synced).toBe(1);
    });

    it("should handle remote deletions", async () => {
      const existingId = "to-be-deleted";
      await db.results.add({
        id: existingId,
        user_id: userId,
        synced: 1,
      } as unknown as Result);

      const remoteDeletion = {
        id: existingId,
        quiz_id: "q1",
        timestamp: Date.now(),
        mode: "zen",
        score: 0,
        time_taken_seconds: 0,
        answers: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: new Date().toISOString(),
      };

      mockSupabase.limit.mockResolvedValue({
        data: [remoteDeletion],
        error: null,
      });

      await syncResults(userId);

      const local = await db.results.get(existingId);
      expect(local).toBeUndefined();
    });

    it("should advance cursor after successful pull", async () => {
      const updatedAt = "2026-03-26T10:00:00.000Z";
      const testUuid = "12345678-1234-1234-1234-123456789012";
      const remoteRecord = {
        id: testUuid,
        quiz_id: "q1",
        timestamp: Date.now(),
        mode: "zen",
        score: 90,
        time_taken_seconds: 10,
        answers: {},
        flagged_questions: [],
        category_breakdown: {},
        updated_at: updatedAt,
        created_at: updatedAt,
        deleted_at: null,
      };

      mockSupabase.limit
        .mockResolvedValueOnce({ data: [remoteRecord], error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      await syncResults(userId);

      const cursor = await readAndRepairResultsSyncCursor(userId);
      expect(cursor.timestamp).toBe(updatedAt);
      expect(cursor.lastId).toBe(testUuid);
    });
  });
});
