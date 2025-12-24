import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { syncSRS } from "@/lib/sync/srsSyncManager";
import type { SRSState } from "@/types/srs";
import { setSRSSyncCursor } from "@/db/syncState";

const FIXED_TIMESTAMP = 1704067200000; // 2024-01-01T00:00:00.000Z

const sampleSRS: SRSState = {
  question_id: "q-1",
  user_id: "user-1",
  box: 1,
  last_reviewed: FIXED_TIMESTAMP,
  next_review: FIXED_TIMESTAMP + 86400000,
  consecutive_correct: 0,
  synced: 0,
  updated_at: FIXED_TIMESTAMP,
};

const {
  dbMock,
  srsData,
  supabaseMock,
} = vi.hoisted(() => {
  const srsData: SRSState[] = [];
  const toArray = vi.fn();
  const bulkPut = vi.fn();
  const get = vi.fn().mockImplementation(async ([qid, uid]: [string, string]) => {
    return srsData.find(s => s.question_id === qid && s.user_id === uid);
  });
  const update = vi.fn();

  // Mock where().equals().toArray() chain for finding unsynced items
  const where = vi.fn().mockReturnValue({
    equals: vi.fn().mockImplementation((val) => {
      // Mock finding unsynced items: [userId, 0]
      if (Array.isArray(val) && val[1] === 0) {
        return {
          toArray: vi.fn().mockImplementation(async () =>
            srsData.filter(s => s.user_id === val[0] && s.synced === 0)
          )
        }
      }
      return { toArray: vi.fn().mockResolvedValue([]) };
    }),
  });

  const db = {
    srs: {
      toArray,
      bulkPut,
      get,
      update,
      where,
    },
    transaction: vi.fn(async (_mode, _tables, callback) => {
      return callback();
    }),
  };

  const supabase = {
    from: vi.fn().mockReturnThis(),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      }),
    },
  };

  return {
    dbMock: db,
    srsData,
    supabaseMock: supabase,
  };
});

vi.mock("@/db", () => ({
  db: dbMock,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: (): typeof supabaseMock => supabaseMock,
}));

vi.mock("@/db/syncState", () => ({
  getSRSSyncCursor: vi
    .fn()
    .mockResolvedValue({
      timestamp: "1970-01-01T00:00:00.000Z",
      lastId: "00000000-0000-0000-0000-000000000000",
    }),
  setSRSSyncCursor: vi.fn().mockResolvedValue(undefined),
  getSyncBlockState: vi.fn().mockResolvedValue(null),
  setSyncBlockState: vi.fn().mockResolvedValue(undefined),
}));

describe("srsSyncManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset Supabase mock chain
    supabaseMock.from.mockReturnThis();
    supabaseMock.rpc.mockResolvedValue({ data: [{ out_question_id: "q-1", out_updated: true }], error: null });
    supabaseMock.select.mockReturnThis();
    supabaseMock.eq.mockReturnThis();
    supabaseMock.or.mockReturnThis();
    supabaseMock.order.mockReturnThis();
    supabaseMock.limit.mockResolvedValue({ data: [], error: null });
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    srsData.length = 0;
    srsData.push(structuredClone(sampleSRS));

    vi.useFakeTimers();
    vi.setSystemTime(FIXED_TIMESTAMP);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("pushes dirty SRS items via batch RPC", async () => {
    await syncSRS("user-1");

    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      "upsert_srs_lww_batch",
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            question_id: sampleSRS.question_id,
            user_id: "user-1",
            box: sampleSRS.box
          })
        ])
      })
    );

    // Should mark as synced locally
    expect(dbMock.srs.update).toHaveBeenCalledWith(
      [sampleSRS.question_id, "user-1"],
      { synced: 1 }
    );
  });

  it("acquires web lock before syncing", async () => {
    const lockRequest = vi
      .fn()
      .mockImplementation(async (_name, _options, callback) =>
        callback({ name: "sync-srs-user-1" }),
      );
    vi.stubGlobal("navigator", { locks: { request: lockRequest }, onLine: true });
    srsData.length = 0;

    await syncSRS("user-1");

    expect(lockRequest).toHaveBeenCalledWith(
      "sync-srs-user-1",
      { ifAvailable: true },
      expect.any(Function),
    );
  });

  it("pulls remote changes and updates local state (Remote Wins)", async () => {
    // Local state is older
    srsData[0]!.last_reviewed = FIXED_TIMESTAMP - 1000;

    const remoteItem = {
      question_id: "q-1",
      user_id: "user-1",
      box: 2,
      last_reviewed: FIXED_TIMESTAMP,
      next_review: FIXED_TIMESTAMP + 10000,
      consecutive_correct: 1,
      updated_at: new Date(FIXED_TIMESTAMP).toISOString()
    };

    supabaseMock.limit.mockResolvedValueOnce({
      data: [remoteItem],
      error: null
    });

    await syncSRS("user-1");

    expect(dbMock.srs.bulkPut).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          question_id: "q-1",
          box: 2,
          synced: 1
        })
      ])
    );
  });

  it("does not overwrite unsynced local state when timestamps tie", async () => {
    srsData[0]!.synced = 0;

    const remoteItem = {
      question_id: "q-1",
      user_id: "user-1",
      box: 3,
      last_reviewed: FIXED_TIMESTAMP,
      next_review: FIXED_TIMESTAMP + 20000,
      consecutive_correct: 2,
      updated_at: new Date(FIXED_TIMESTAMP).toISOString()
    };

    supabaseMock.limit.mockResolvedValueOnce({
      data: [remoteItem],
      error: null
    });

    await syncSRS("user-1");

    expect(dbMock.srs.bulkPut).not.toHaveBeenCalled();
  });

  it("ignores remote changes if local state is newer (Local Wins)", async () => {
    // Local state is newer
    srsData[0]!.last_reviewed = FIXED_TIMESTAMP + 1000;

    const remoteItem = {
      question_id: "q-1",
      user_id: "user-1",
      box: 2,
      last_reviewed: FIXED_TIMESTAMP,
      next_review: FIXED_TIMESTAMP + 10000,
      consecutive_correct: 1,
      updated_at: new Date(FIXED_TIMESTAMP).toISOString()
    };

    supabaseMock.limit.mockResolvedValueOnce({
      data: [remoteItem],
      error: null
    });

    await syncSRS("user-1");

    // Should NOT update local db
    expect(dbMock.srs.bulkPut).not.toHaveBeenCalled();

    // But should update cursor
    expect(setSRSSyncCursor).toHaveBeenCalled();
  });

  it("skips sync when browser is offline", async () => {
    vi.stubGlobal("navigator", { onLine: false });

    const result = await syncSRS("user-1");

    expect(result.incomplete).toBe(true);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("skips sync when no valid auth session", async () => {
    supabaseMock.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    const result = await syncSRS("user-1");

    expect(result.incomplete).toBe(true);
    // Should not attempt push/pull
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("skips invalid remote records during pull", async () => {
    srsData.length = 0; // No local data

    const invalidRemoteItem = {
      question_id: "q-invalid",
      user_id: "user-1",
      box: 99, // Invalid box number (should be 1-5)
      last_reviewed: FIXED_TIMESTAMP,
      next_review: FIXED_TIMESTAMP + 10000,
      consecutive_correct: 1,
      updated_at: new Date(FIXED_TIMESTAMP).toISOString()
    };

    supabaseMock.limit.mockResolvedValueOnce({
      data: [invalidRemoteItem],
      error: null
    });

    await syncSRS("user-1");

    // Should NOT save invalid record
    expect(dbMock.srs.bulkPut).not.toHaveBeenCalled();

    // But should still update cursor to prevent infinite loop
    expect(setSRSSyncCursor).toHaveBeenCalled();
  });

  it("does NOT mark synced when server rejects stale local data (server has newer last_reviewed)", async () => {
    // RPC returns out_updated: false, indicating server had newer data
    supabaseMock.rpc.mockResolvedValueOnce({
      data: [{ out_question_id: "q-1", out_updated: false }],
      error: null,
    });

    await syncSRS("user-1");

    // Should NOT mark as synced — server rejected because it had newer data
    // This leaves the item unsynced so next pull can reconcile
    expect(dbMock.srs.update).not.toHaveBeenCalled();

    // Verify RPC was called with correct structure
    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      "upsert_srs_lww_batch",
      expect.objectContaining({
        items: expect.any(Array),
      })
    );
  });
});
