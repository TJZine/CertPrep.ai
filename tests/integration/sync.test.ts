import "fake-indexeddb/auto";
import { beforeAll, beforeEach, describe, expect, it, vi, afterEach, afterAll } from "vitest";
import { db, clearDatabase } from "@/db";
import { syncQuizzes } from "@/lib/sync/quizSyncManager";
import { fetchUserQuizzes, upsertQuizzes } from "@/lib/sync/quizRemote";
import { syncResults } from "@/lib/sync/syncManager";
import type { Quiz } from "@/types/quiz";

const { supabaseMock, mockFrom, createChain } = vi.hoisted(() => {
  const mockFrom = vi.fn();

  // Chainable mock builder
  const createChain = (returnValue: { data: unknown[]; error: null }): Record<string, ReturnType<typeof vi.fn>> => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(returnValue), // Terminating call for PULL
      upsert: vi.fn().mockResolvedValue({ error: null }), // Terminating call for PUSH
    };
    return chain;
  };

  const supabase = {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: "test-user-123" } } },
        error: null,
      }),
    },
    from: mockFrom,
  };

  return { supabaseMock: supabase, mockFrom, createChain };
});

vi.mock("@/lib/supabase/client", () => ({
  createClient: (): typeof supabaseMock => supabaseMock,
}));

// Mock the remote API layer
vi.mock("@/lib/sync/quizRemote", () => ({
  fetchUserQuizzes: vi.fn(),
  upsertQuizzes: vi.fn(),
}));

// Mock Web Locks API since it's not in Node/JSDOM by default
const requestLock = vi.fn(async (_name, _options, callback) => {
  return callback({ name: "mock-lock" });
});

describe("Integration: Quiz Sync Engine", () => {
  const userId = "test-user-123";

  beforeAll(() => {
    vi.stubGlobal("navigator", {
      locks: { request: requestLock },
      onLine: true,
    });
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await clearDatabase();

    // Default mock responses
    vi.mocked(fetchUserQuizzes).mockResolvedValue({ data: [], error: null });
    vi.mocked(upsertQuizzes).mockResolvedValue({ error: null });

    // Default supabase chain behavior (return empty list for generic selects)
    mockFrom.mockReturnValue(createChain({ data: [], error: null }));
  });

  afterEach(async () => {
    await clearDatabase();
  });

  it("pushes a locally created quiz to remote", async () => {
    // 1. Create local quiz
    const quizId = "local-quiz-1";
    const localQuiz: Quiz = {
      id: quizId,
      user_id: userId,
      title: "My Local Quiz",
      description: "Created offline",
      created_at: Date.now(),
      updated_at: Date.now(),
      questions: [],
      tags: [],
      version: 1,
      deleted_at: null,
      quiz_hash: null,
      last_synced_version: null, // Not synced yet
      last_synced_at: null,
    };

    await db.quizzes.add(localQuiz);

    // 2. Run Sync
    await syncQuizzes(userId);

    // 3. Verify push occurred
    expect(upsertQuizzes).toHaveBeenCalledTimes(1);
    const pushCall = vi.mocked(upsertQuizzes).mock.calls[0];
    expect(pushCall).toBeDefined();
    if (!pushCall) throw new Error("Expected upsertQuizzes to be called");
    expect(pushCall[0]).toBe(userId); // userId arg
    const pushedQuizzes = pushCall[1]; // payload arg
    expect(pushedQuizzes).toBeDefined();
    if (!pushedQuizzes) throw new Error("Expected payload argument");
    expect(pushedQuizzes).toHaveLength(1);
    expect(pushedQuizzes[0]?.id).toBe(quizId);
    expect(pushedQuizzes[0]?.title).toBe("My Local Quiz");

    // 4. Verify local state updated (metadata)
    const updatedLocal = await db.quizzes.get(quizId);
    expect(updatedLocal?.last_synced_version).toBe(1);
    expect(updatedLocal?.last_synced_at).not.toBeNull();
  });

  it("pulls a remote quiz and saves it locally", async () => {
    // 1. Mock remote data
    const remoteQuizId = "remote-quiz-99";
    const remoteQuiz = {
      id: remoteQuizId,
      user_id: userId,
      title: "Remote Quiz",
      description: "From cloud",
      tags: ["cloud"],
      version: 5,
      questions: [],
      quiz_hash: "abc-123",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    vi.mocked(fetchUserQuizzes).mockResolvedValueOnce({
      data: [remoteQuiz],
      error: null,
    });

    // 2. Run Sync
    await syncQuizzes(userId);

    // 3. Verify pull occurred
    expect(fetchUserQuizzes).toHaveBeenCalled();

    // 4. Verify local DB has the quiz
    const localCopy = await db.quizzes.get(remoteQuizId);
    expect(localCopy).toBeDefined();
    expect(localCopy?.title).toBe("Remote Quiz");
    expect(localCopy?.version).toBe(5);
    expect(localCopy?.last_synced_version).toBe(5);
  });

  it("handles conflict: remote wins (default policy)", async () => {
    // 1. Setup Local Quiz (Version 1)
    const quizId = "conflict-quiz";
    const localQuiz: Quiz = {
      id: quizId,
      user_id: userId,
      title: "Local Title",
      description: "",
      created_at: Date.now(),
      updated_at: Date.now(),
      questions: [],
      tags: [],
      version: 1,
      deleted_at: null,
      quiz_hash: "local-hash",
      last_synced_version: 1,
      last_synced_at: Date.now() - 10000,
    };
    await db.quizzes.add(localQuiz);

    // 2. Setup Remote Quiz (Version 2 - Newer)
    const remoteQuiz = {
      id: quizId,
      user_id: userId,
      title: "Remote Title Wins",
      description: "",
      tags: [],
      version: 2,
      questions: [],
      quiz_hash: "remote-hash",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    vi.mocked(fetchUserQuizzes).mockResolvedValueOnce({
      data: [remoteQuiz],
      error: null,
    });

    // 3. Run Sync
    await syncQuizzes(userId);

    // 4. Verify Remote Won
    const finalState = await db.quizzes.get(quizId);
    expect(finalState?.title).toBe("Remote Title Wins");
    expect(finalState?.version).toBe(2);
    expect(finalState?.last_synced_version).toBe(2);
  });

  it("does not overwrite local changes if local version is higher (optimistic lock)", async () => {
    // 1. Setup Local Quiz (Version 3 - Ahead of last sync)
    const quizId = "local-ahead";
    const localQuiz: Quiz = {
      id: quizId,
      user_id: userId,
      title: "Local Is Ahead",
      description: "",
      created_at: Date.now(),
      updated_at: Date.now(),
      questions: [],
      tags: [],
      version: 3,
      deleted_at: null,
      quiz_hash: "local-hash",
      last_synced_version: 2, // Last time we synced, it was v2
      last_synced_at: Date.now() - 10000,
    };
    await db.quizzes.add(localQuiz);

    // 2. Setup Remote Quiz (Version 2 - Stale/Same as last sync)
    // Even if remote returns v2, we shouldn't downgrade to it.
    const remoteQuiz = {
      id: quizId,
      user_id: userId,
      title: "Remote Stale",
      description: "",
      tags: [],
      version: 2,
      questions: [],
      quiz_hash: "remote-hash",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    vi.mocked(fetchUserQuizzes).mockResolvedValueOnce({
      data: [remoteQuiz],
      error: null,
    });

    // 3. Run Sync
    await syncQuizzes(userId);

    // 4. Verify Local Kept
    const finalState = await db.quizzes.get(quizId);
    expect(finalState?.title).toBe("Local Is Ahead");
    expect(finalState?.version).toBe(3);

    // Note: In a real scenario, we would also expect a PUSH to happen for v3
    expect(upsertQuizzes).toHaveBeenCalled();
  });

  it("pushes SRS quiz to remote during sync", async () => {
    // 1. Create SRS quiz using the helper
    const { getOrCreateSRSQuiz, getSRSQuizId } = await import("@/db/quizzes");
    const srsQuiz = await getOrCreateSRSQuiz(userId);

    // Verify it was created locally
    expect(srsQuiz.id).toBe(getSRSQuizId(userId));
    expect(srsQuiz.last_synced_version).toBeNull();

    // 2. Run Sync
    await syncQuizzes(userId);

    // 3. Verify push occurred and included SRS quiz
    expect(upsertQuizzes).toHaveBeenCalled();
    const pushCalls = vi.mocked(upsertQuizzes).mock.calls;
    const allPushedQuizzes = pushCalls.flatMap((call) => call[1] ?? []);
    const pushedSRS = allPushedQuizzes.find((q) => q.id === srsQuiz.id);

    expect(pushedSRS).toBeDefined();
    expect(pushedSRS?.title).toBe("SRS Review Sessions");

    // 4. Verify local state updated (metadata)
    const updatedLocal = await db.quizzes.get(srsQuiz.id);
    expect(updatedLocal?.last_synced_version).toBe(srsQuiz.version);
    expect(updatedLocal?.last_synced_at).not.toBeNull();
  });

  it("applies remote deletions locally (prevents resurrection)", async () => {
    // 1. Create a result locally that is NOT deleted
    const resultId = "resurrect-test";
    await db.results.add({
      id: resultId,
      user_id: userId,
      quiz_id: "some-quiz",
      timestamp: Date.now() - 10000,
      mode: "zen",
      score: 50,
      time_taken_seconds: 10,
      answers: {},
      flagged_questions: [],
      category_breakdown: {},
      synced: 1, // Assume already synced previously
      deleted_at: undefined,
    });

    // 2. Mock Remote Data: Same result but DELETED remotely
    const remoteDeletedResult = {
      id: resultId,
      user_id: userId,
      quiz_id: "some-quiz",
      timestamp: 1234567890,
      mode: "zen",
      score: 50,
      deleted_at: new Date().toISOString(), // Deleted remotely!
      updated_at: new Date().toISOString(),
      created_at: new Date(Date.now() - 20000).toISOString(),
      // Required fields for schema validation
      time_taken_seconds: 10,
      answers: {},
      flagged_questions: [],
      category_breakdown: {},
      question_ids: [],
    };

    // 3. Setup Mock for this specific test
    // We override the default mock behavior to return our deleted result
    mockFrom.mockReturnValueOnce(createChain({
      data: [remoteDeletedResult],
      error: null
    }));

    // 4. Run Sync
    await syncResults(userId);

    // 5. Verify local result is DELETED
    const localResult = await db.results.get(resultId);
    expect(localResult).toBeUndefined();
  });
});
