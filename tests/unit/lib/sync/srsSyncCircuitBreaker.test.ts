import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { syncSRS } from "@/lib/sync/srsSyncManager";

// Mock deps
vi.mock("@/lib/logger", () => ({
    logger: {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
    },
}));

vi.mock("@/db/syncState", () => ({
    getSRSSyncCursor: vi.fn().mockResolvedValue({
        timestamp: "1970-01-01T00:00:00.000Z",
        lastId: "00000000-0000-0000-0000-000000000000",
    }),
    setSRSSyncCursor: vi.fn(),
    getSyncBlockState: vi.fn().mockResolvedValue(null),
    setSyncBlockState: vi.fn(),
}));

vi.mock("@/db", () => {
    const dbMock = {
        srs: {
            where: vi.fn().mockReturnValue({
                equals: vi.fn().mockReturnValue({
                    toArray: vi.fn().mockResolvedValue([]),
                }),
            }),
            bulkPut: vi.fn(),
            get: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
        },
        transaction: vi.fn((_mode, _tables, cb) => cb()),
    };
    return { db: dbMock };
});

const mockLimit = vi.fn();
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const getMockSupabase = () => ({
    auth: {
        getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user-1" } },
            error: null,
        }),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: mockLimit, // Use the hoisted var
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
});

const mockSupabase = getMockSupabase();

vi.mock("@/lib/supabase/client", () => ({
    createClient: (): typeof mockSupabase => mockSupabase,
}));

vi.mock("@sentry/nextjs", () => ({
    startSpan: vi.fn((_p, cb) => cb()),
}));

describe("SRS Sync Circuit Breaker", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal("navigator", { onLine: true });

        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("triggers circuit breaker after MAX_INVALID_BATCHES", async () => {
        const invalidItem = {
            question_id: "q-bad",
            user_id: "user-1",
            updated_at: "2024-01-01T00:00:00.000Z"
            // Missing required fields
        };

        // Construct a batch of 50 (BATCH_SIZE) invalid items to force 'hasMore = true'
        const fullInvalidBatch = Array(50).fill(invalidItem);

        // Iteration 1: 50 invalid items -> invalid batch #1 -> hasMore=true
        mockLimit.mockResolvedValue({
            data: fullInvalidBatch,
            error: null
        });

        const result = await syncSRS("user-1");

        expect(result.incomplete).toBe(true);

        const { setSyncBlockState } = await import("@/db/syncState");
        expect(setSyncBlockState).toHaveBeenCalledWith("user-1", "srs", "schema_drift");
    });

    it("respects existing block state", async () => {
        const { getSyncBlockState } = await import("@/db/syncState");
        vi.mocked(getSyncBlockState).mockResolvedValueOnce({
            reason: "schema_drift",
            blockedAt: Date.now(),
            ttlMs: 3600000,
        });

        const result = await syncSRS("user-1");

        expect(result.incomplete).toBe(true);
        // Should not try to pull
        expect(mockSupabase.from).not.toHaveBeenCalled();
    });
});
