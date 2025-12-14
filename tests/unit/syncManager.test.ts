import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncResults } from "@/lib/sync/syncManager";
import { db } from "@/db";
import * as syncState from "@/db/syncState";
import type { Result } from "@/types/result";

// Mock dependencies
vi.mock("@/db", () => ({
  db: {
    results: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
      bulkUpdate: vi.fn(),
      bulkPut: vi.fn(),
      bulkDelete: vi.fn(),
    },
    quizzes: {
      bulkGet: vi.fn().mockResolvedValue([]),
    },
    syncState: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
      bulkPut: vi.fn(),
    },
    transaction: vi.fn((...args) => {
      const callback = args[args.length - 1] as () => unknown;
      return callback();
    }),
  },
}));

vi.mock("@/db/syncState", () => ({
  getSyncCursor: vi
    .fn()
    .mockResolvedValue({
      timestamp: "2023-01-01T00:00:00.000Z",
      lastId: "00000000-0000-0000-0000-000000000000",
    }),
  setSyncCursor: vi.fn().mockResolvedValue(undefined),
}));

// Mock safeMark/safeMeasure
vi.mock("@/lib/perfMarks", () => ({
  safeMark: vi.fn(),
  safeMeasure: vi.fn(),
}));

const { mockSupabase } = vi.hoisted(() => {
  const mock = {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null,
      }),
    },
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    in: vi.fn(),
  };
  // Mock chainable methods
  mock.from.mockReturnValue(mock);
  mock.select.mockReturnValue(mock);
  mock.eq.mockReturnValue(mock);
  mock.or.mockReturnValue(mock);
  mock.order.mockReturnValue(mock);
  mock.limit.mockReturnValue(mock);
  mock.upsert.mockResolvedValue({ error: null });
  mock.update.mockReturnValue(mock);
  mock.in.mockResolvedValue({ error: null });
  return { mockSupabase: mock };
});

vi.mock("@/lib/supabase/client", () => ({
  createClient: (): typeof mockSupabase => mockSupabase,
}));

describe("SyncManager", () => {
  beforeEach((): void => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "onLine", {
      value: true,
      configurable: true,
    });
  });

  it("should advance cursor using updated_at even if all results in a batch are invalid", async () => {
    // Mock 50 invalid results (missing required fields)
    const invalidResults = Array(50)
      .fill(null)
      .map((_, i) => ({
        id: `invalid-id-${i}`,
        // Missing other required fields like quiz_id, timestamp, etc.
        created_at: new Date(Date.now() + i * 1000).toISOString(),
        updated_at: new Date(Date.now() + i * 1000).toISOString(),
      }));

    // First call returns 50 invalid items
    // Second call returns empty to break the loop
    mockSupabase.limit
      .mockResolvedValueOnce({ data: invalidResults, error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    await syncResults("user-123");

    // Verify setSyncCursor was called with the updated_at AND id of the last invalid record
    const lastResult = invalidResults[invalidResults.length - 1];
    expect(syncState.setSyncCursor).toHaveBeenCalledWith(
      lastResult?.updated_at,
      "user-123",
      lastResult?.id,
    );

    // Verify bulkPut was NOT called (since no valid results)
    expect(db.results.bulkPut).not.toHaveBeenCalled();
  });

  it("should use keyset pagination with updated_at in supabase query", async () => {
    mockSupabase.limit.mockResolvedValueOnce({ data: [], error: null });

    await syncResults("user-123");

    expect(mockSupabase.or).toHaveBeenCalled();
    // Verify double ordering using updated_at
    expect(mockSupabase.order).toHaveBeenCalledWith("updated_at", {
      ascending: true,
    });
    expect(mockSupabase.order).toHaveBeenCalledWith("id", { ascending: true });
  });

  it("should acquire web lock before syncing", async () => {
    // Mock navigator.locks
    const mockRequest = vi
      .fn()
      .mockImplementation(async (_name, _options, callback) => {
        await callback({ name: "sync-results" });
      });

    try {
      vi.stubGlobal("navigator", {
        locks: { request: mockRequest },
        onLine: true,
      });
      mockSupabase.limit.mockResolvedValueOnce({ data: [], error: null });

      await syncResults("user-123");

      expect(mockRequest).toHaveBeenCalledWith(
        "sync-results-user-123",
        { ifAvailable: true },
        expect.any(Function),
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("should push unsynced local results (upsert) to Supabase", async () => {
    const unsyncedResults = [
      {
        id: "local-1",
        user_id: "user-123",
        score: 100,
        synced: 0,
        quiz_id: "quiz-1",
        timestamp: Date.now(),
        mode: "practice",
        time_taken_seconds: 60,
        answers: {},
        flagged_questions: [],
        category_breakdown: {},
        deleted_at: null,
      },
    ];

    vi.mocked(db.results.toArray).mockResolvedValueOnce(
      unsyncedResults as unknown as Result[],
    );

    // Mock: Quiz is synced (FK pre-flight passes)
    vi.mocked(db.quizzes.bulkGet).mockResolvedValueOnce(
      [{ id: "quiz-1", last_synced_at: Date.now() }] as unknown as Awaited<ReturnType<typeof db.quizzes.bulkGet>>,
    );

    mockSupabase.upsert.mockResolvedValue({ error: null });
    mockSupabase.limit.mockResolvedValue({ data: [], error: null });

    await syncResults("user-123");

    // Verify upsert called with correct data (deleted_at: null)
    expect(mockSupabase.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: "local-1",
          deleted_at: null,
        }),
      ]),
      { onConflict: "id" },
    );
  });

  it("should push locally deleted results to Supabase", async () => {
    const deletionTime = Date.now();
    const unsyncedResults = [
      {
        id: "local-deleted-1",
        user_id: "user-123",
        score: 100,
        synced: 0,
        quiz_id: "quiz-1",
        timestamp: Date.now(),
        mode: "practice",
        time_taken_seconds: 60,
        answers: {},
        flagged_questions: [],
        category_breakdown: {},
        deleted_at: deletionTime, // Locally deleted
      },
    ];

    vi.mocked(db.results.toArray).mockResolvedValueOnce(
      unsyncedResults as unknown as Result[],
    );

    // Mock: Quiz is synced (FK pre-flight passes)
    vi.mocked(db.quizzes.bulkGet).mockResolvedValueOnce(
      [{ id: "quiz-1", last_synced_at: Date.now() }] as unknown as Awaited<ReturnType<typeof db.quizzes.bulkGet>>,
    );

    mockSupabase.upsert.mockResolvedValue({ error: null });
    mockSupabase.limit.mockResolvedValue({ data: [], error: null });

    await syncResults("user-123");

    // Verify upsert called with deleted_at set to ISO string
    expect(mockSupabase.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: "local-deleted-1",
          deleted_at: new Date(deletionTime).toISOString(),
        }),
      ]),
      { onConflict: "id" },
    );

    // Verify local DB updated to synced
    expect(db.results.bulkUpdate).toHaveBeenCalledWith([
      { key: "local-deleted-1", changes: { synced: 1 } },
    ]);
  });

  it("should apply remote deletions locally", async () => {
    const remoteResults = [
      {
        id: "remote-deleted-1",
        quiz_id: "quiz-1",
        timestamp: 1234567890,
        mode: "zen",
        score: 100,
        time_taken_seconds: 60,
        answers: {},
        flagged_questions: [],
        category_breakdown: {},
        created_at: "2023-01-01T10:00:00.000Z",
        updated_at: "2023-01-01T12:00:00.000Z",
        deleted_at: "2023-01-01T12:00:00.000Z", // Remote deleted
      },
    ];

    mockSupabase.limit
      .mockResolvedValueOnce({ data: remoteResults, error: null })
      .mockResolvedValue({ data: [], error: null });

    await syncResults("user-123");

    // Verify bulkDelete was called
    expect(db.results.bulkDelete).toHaveBeenCalledWith(["remote-deleted-1"]);

    // Verify cursor updated to the deleted record's timestamp
    expect(syncState.setSyncCursor).toHaveBeenCalledWith(
      "2023-01-01T12:00:00.000Z",
      "user-123",
      "remote-deleted-1"
    );
  });

  it("should not mark results as synced if push fails", async () => {
    const unsyncedResults = [
      {
        id: "local-1",
        user_id: "user-123",
        score: 100,
        synced: 0,
        quiz_id: "quiz-1",
        timestamp: Date.now(),
        mode: "practice",
        time_taken_seconds: 60,
        answers: {},
        flagged_questions: [],
        category_breakdown: {},
        deleted_at: null,
      },
    ];

    vi.mocked(db.results.toArray).mockResolvedValueOnce(
      unsyncedResults as unknown as Result[],
    );

    // Mock: Quiz is synced (FK pre-flight passes)
    vi.mocked(db.quizzes.bulkGet).mockResolvedValueOnce(
      [{ id: "quiz-1", last_synced_at: Date.now() }] as unknown as Awaited<ReturnType<typeof db.quizzes.bulkGet>>,
    );

    mockSupabase.upsert.mockResolvedValue({
      error: { message: "Network error" },
    });

    mockSupabase.limit.mockResolvedValue({ data: [], error: null });

    const result = await syncResults("user-123");

    expect(mockSupabase.upsert).toHaveBeenCalled();
    expect(db.results.bulkUpdate).not.toHaveBeenCalled();
    expect(result.incomplete).toBe(true);
    expect(result.error).toContain("Network error");
  });

  describe("FK Pre-Flight Validation", () => {
    it("should skip results whose quiz has not been synced yet", async () => {
      const unsyncedResults = [
        {
          id: "result-1",
          user_id: "user-123",
          score: 80,
          synced: 0,
          quiz_id: "srs-user-123", // SRS quiz - not synced
          timestamp: Date.now(),
          mode: "zen",
          time_taken_seconds: 120,
          answers: {},
          flagged_questions: [],
          category_breakdown: {},
          deleted_at: null,
        },
      ];

      vi.mocked(db.results.toArray).mockResolvedValueOnce(
        unsyncedResults as unknown as Result[],
      );

      // Mock: SRS quiz exists locally but has NOT been synced (last_synced_at = null)
      vi.mocked(db.quizzes.bulkGet).mockResolvedValueOnce([
        {
          id: "srs-user-123",
          user_id: "user-123",
          title: "SRS Review Sessions",
          last_synced_at: null, // Not synced!
          last_synced_version: null,
          version: 1,
          questions: [],
          tags: [],
          created_at: Date.now(),
          updated_at: Date.now(),
          deleted_at: null,
          quiz_hash: null,
          description: "",
        },
      ]);

      mockSupabase.limit.mockResolvedValue({ data: [], error: null });

      const result = await syncResults("user-123");

      // Verify upsert was NOT called (result should be skipped)
      expect(mockSupabase.upsert).not.toHaveBeenCalled();
      // Verify sync marked as incomplete (so retry happens later)
      expect(result.incomplete).toBe(true);
    });

    it("should push results whose quiz has been synced", async () => {
      const unsyncedResults = [
        {
          id: "result-2",
          user_id: "user-123",
          score: 90,
          synced: 0,
          quiz_id: "quiz-synced",
          timestamp: Date.now(),
          mode: "practice",
          time_taken_seconds: 60,
          answers: {},
          flagged_questions: [],
          category_breakdown: {},
          deleted_at: null,
        },
      ];

      vi.mocked(db.results.toArray).mockResolvedValueOnce(
        unsyncedResults as unknown as Result[],
      );

      // Mock: Quiz HAS been synced
      vi.mocked(db.quizzes.bulkGet).mockResolvedValueOnce([
        {
          id: "quiz-synced",
          user_id: "user-123",
          title: "My Synced Quiz",
          last_synced_at: Date.now() - 10000, // Synced!
          last_synced_version: 1,
          version: 1,
          questions: [],
          tags: [],
          created_at: Date.now(),
          updated_at: Date.now(),
          deleted_at: null,
          quiz_hash: "abc123",
          description: "",
        },
      ]);

      mockSupabase.upsert.mockResolvedValue({ error: null });
      mockSupabase.limit.mockResolvedValue({ data: [], error: null });

      await syncResults("user-123");

      // Verify upsert WAS called with the result
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: "result-2" }),
        ]),
        { onConflict: "id" },
      );
      // Verify result marked as synced
      expect(db.results.bulkUpdate).toHaveBeenCalledWith([
        { key: "result-2", changes: { synced: 1 } },
      ]);
    });

    it("should push only results with synced quizzes when mixed", async () => {
      const unsyncedResults = [
        {
          id: "result-syncable",
          user_id: "user-123",
          score: 85,
          synced: 0,
          quiz_id: "quiz-synced",
          timestamp: Date.now(),
          mode: "practice",
          time_taken_seconds: 45,
          answers: {},
          flagged_questions: [],
          category_breakdown: {},
          deleted_at: null,
        },
        {
          id: "result-blocked",
          user_id: "user-123",
          score: 70,
          synced: 0,
          quiz_id: "srs-user-123", // Not synced
          timestamp: Date.now(),
          mode: "zen",
          time_taken_seconds: 90,
          answers: {},
          flagged_questions: [],
          category_breakdown: {},
          deleted_at: null,
        },
      ];

      vi.mocked(db.results.toArray).mockResolvedValueOnce(
        unsyncedResults as unknown as Result[],
      );

      // Mock: One quiz synced, one not
      vi.mocked(db.quizzes.bulkGet).mockResolvedValueOnce([
        {
          id: "quiz-synced",
          user_id: "user-123",
          title: "Synced Quiz",
          last_synced_at: Date.now(),
          last_synced_version: 1,
          version: 1,
          questions: [],
          tags: [],
          created_at: Date.now(),
          updated_at: Date.now(),
          deleted_at: null,
          quiz_hash: "xyz",
          description: "",
        },
        {
          id: "srs-user-123",
          user_id: "user-123",
          title: "SRS Review Sessions",
          last_synced_at: null, // NOT synced
          last_synced_version: null,
          version: 1,
          questions: [],
          tags: [],
          created_at: Date.now(),
          updated_at: Date.now(),
          deleted_at: null,
          quiz_hash: null,
          description: "",
        },
      ]);

      mockSupabase.upsert.mockResolvedValue({ error: null });
      mockSupabase.limit.mockResolvedValue({ data: [], error: null });

      const result = await syncResults("user-123");

      // Verify only the syncable result was pushed
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        [expect.objectContaining({ id: "result-syncable" })],
        { onConflict: "id" },
      );
      // Verify only the synced result was marked
      expect(db.results.bulkUpdate).toHaveBeenCalledWith([
        { key: "result-syncable", changes: { synced: 1 } },
      ]);
      // Verify incomplete due to skipped results
      expect(result.incomplete).toBe(true);
    });

    it("should continue to PULL phase even when results are skipped (no deadlock)", async () => {
      // This test verifies the fix for the sync deadlock issue:
      // Previously, skipped results would cause early return before PULL,
      // blocking all inbound sync updates.

      const unsyncedResults = [
        {
          id: "result-blocked",
          user_id: "user-123",
          score: 70,
          synced: 0,
          quiz_id: "missing-quiz", // Quiz doesn't exist or not synced
          timestamp: Date.now(),
          mode: "zen",
          time_taken_seconds: 90,
          answers: {},
          flagged_questions: [],
          category_breakdown: {},
          deleted_at: null,
        },
      ];

      vi.mocked(db.results.toArray).mockResolvedValueOnce(
        unsyncedResults as unknown as Result[],
      );

      // Mock: Quiz is NOT synced (will be skipped)
      vi.mocked(db.quizzes.bulkGet).mockResolvedValueOnce([undefined]); // Quiz not found

      // Mock: Remote has valid results to pull
      const remoteResults = [
        {
          id: "remote-result-1",
          quiz_id: "quiz-1",
          timestamp: 1234567890,
          mode: "zen", // Must be "zen" or "proctor" per schema
          score: 85,
          time_taken_seconds: 120,
          answers: {},
          flagged_questions: [],
          category_breakdown: {},
          created_at: "2023-06-01T10:00:00.000Z",
          updated_at: "2023-06-01T12:00:00.000Z",
          deleted_at: null,
        },
      ];

      mockSupabase.limit
        .mockResolvedValueOnce({ data: remoteResults, error: null })
        .mockResolvedValueOnce({ data: [], error: null }); // End pagination

      const result = await syncResults("user-123");

      // CRITICAL: Verify PULL happened (no deadlock)
      expect(db.results.bulkPut).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: "remote-result-1" }),
        ]),
      );

      // Sync marked incomplete (because push had skipped results)
      expect(result.incomplete).toBe(true);

      // But we DID pull successfully
      expect(result.status).toBe("failed"); // status reflects push failure
    });
  });
});