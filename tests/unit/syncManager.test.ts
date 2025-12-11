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
  };
  // Mock chainable methods
  mock.from.mockReturnValue(mock);
  mock.select.mockReturnValue(mock);
  mock.eq.mockReturnValue(mock);
  mock.or.mockReturnValue(mock);
  mock.order.mockReturnValue(mock);
  mock.limit.mockReturnValue(mock);
  mock.upsert.mockResolvedValue({ error: null });
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

  it("should advance cursor even if all results in a batch are invalid", async () => {
    // Mock 50 invalid results (missing required fields)
    const invalidResults = Array(50)
      .fill(null)
      .map((_, i) => ({
        id: `invalid-id-${i}`,
        // Missing other required fields like quiz_id, timestamp, etc.
        created_at: new Date(Date.now() + i * 1000).toISOString(),
      }));

    // First call returns 50 invalid items
    // Second call returns empty to break the loop
    mockSupabase.limit
      .mockResolvedValueOnce({ data: invalidResults, error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    await syncResults("user-123");

    // Verify setSyncCursor was called with the timestamp AND id of the last invalid record
    const lastResult = invalidResults[invalidResults.length - 1];
    expect(syncState.setSyncCursor).toHaveBeenCalledWith(
      lastResult?.created_at,
      "user-123",
      lastResult?.id,
    );

    // Verify bulkPut was NOT called (since no valid results)
    expect(db.results.bulkPut).not.toHaveBeenCalled();
  });

  it("should use keyset pagination in supabase query", async () => {
    mockSupabase.limit.mockResolvedValueOnce({ data: [], error: null });

    await syncResults("user-123");

    expect(mockSupabase.or).toHaveBeenCalled();
    // Verify double ordering
    expect(mockSupabase.order).toHaveBeenCalledWith("created_at", {
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

  it("should push unsynced local results to Supabase", async () => {
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
      },
      {
        id: "local-2",
        user_id: "user-123",
        score: 90,
        synced: 0,
        quiz_id: "quiz-2",
        timestamp: Date.now(),
        mode: "exam",
        time_taken_seconds: 120,
        answers: {},
        flagged_questions: [],
        category_breakdown: {},
      },
    ];

    // Mock local DB returning unsynced items
    vi.mocked(db.results.toArray).mockResolvedValueOnce(
      unsyncedResults as unknown as Result[],
    );

    // Mock Supabase upsert success
    mockSupabase.upsert.mockResolvedValue({ error: null });

    // Mock empty pull response to stop loop
    mockSupabase.limit.mockResolvedValue({ data: [], error: null });

    await syncResults("user-123");

    // Verify upsert called with correct data (excluding 'synced' field)
    expect(mockSupabase.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: "local-1",
          score: 100,
          user_id: "user-123",
        }),
        expect.objectContaining({
          id: "local-2",
          score: 90,
          user_id: "user-123",
        }),
      ]),
      { onConflict: "id" },
    );

    const calls = mockSupabase.upsert.mock.calls[0];
    const payload = calls ? calls[0] : [];
    expect(Array.isArray(payload)).toBe(true);

    expect(
      payload.every((row: Record<string, unknown>) => !("synced" in row)),
    ).toBe(true);

    // Verify local DB updated to synced: 1
    expect(db.results.bulkUpdate).toHaveBeenCalledWith([
      { key: "local-1", changes: { synced: 1 } },
      { key: "local-2", changes: { synced: 1 } },
    ]);
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
      },
    ];

    vi.mocked(db.results.toArray).mockResolvedValueOnce(
      unsyncedResults as unknown as Result[],
    );

    // Mock Supabase upsert failure
    mockSupabase.upsert.mockResolvedValue({
      error: { message: "Network error" },
    });

    mockSupabase.limit.mockResolvedValue({ data: [], error: null });

    const result = await syncResults("user-123");

    expect(mockSupabase.upsert).toHaveBeenCalled();
    // Verify bulkUpdate was NOT called
    expect(db.results.bulkUpdate).not.toHaveBeenCalled();
    expect(result.incomplete).toBe(true);
    expect(result.error).toContain("Network error");
  });

  it("should mark sync incomplete when fetch fails", async () => {
    mockSupabase.limit.mockResolvedValueOnce({
      data: null,
      error: { message: "RLS denied" },
    });

    const result = await syncResults("user-123");

    expect(result.incomplete).toBe(true);
    expect(result.error).toContain("RLS denied");
  });

  describe("auth failure scenarios", () => {
    it("should skip sync when no auth session exists", async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      const result = await syncResults("user-123");

      expect(result.incomplete).toBe(true);
      expect(result.error).toBe("Not authenticated");
      expect(result.status).toBe("skipped");
      // Verify no sync operations were attempted
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("should skip sync when getSession returns an error", async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: { message: "Auth service unavailable" },
      });

      const result = await syncResults("user-123");

      expect(result.incomplete).toBe(true);
      expect(result.error).toBe("Not authenticated");
      expect(result.status).toBe("skipped");
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("should fail sync when session user ID does not match requested userId", async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: { user: { id: "different-user-456" } } },
        error: null,
      });

      const result = await syncResults("user-123");

      expect(result.incomplete).toBe(true);
      expect(result.error).toBe("User ID mismatch - please re-login");
      expect(result.status).toBe("failed");
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });
});
