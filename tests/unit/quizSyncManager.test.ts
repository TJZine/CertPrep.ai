import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { syncQuizzes } from "@/lib/sync/quizSyncManager";
import type { Quiz } from "@/types/quiz";
import { setQuizSyncCursor } from "@/db/syncState";

const FIXED_TIMESTAMP = 1704067200000; // 2024-01-01T00:00:00.000Z

const { supabaseMock } = vi.hoisted(() => {
  const supabase = {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: "user-1" } } },
        error: null,
      }),
    },
  };

  return { supabaseMock: supabase };
});

const sampleQuiz: Quiz = {
  id: "quiz-1",
  user_id: "user-1",
  title: "Quiz",
  description: "",
  created_at: FIXED_TIMESTAMP,
  updated_at: FIXED_TIMESTAMP,
  questions: [],
  tags: [],
  version: 2,
  deleted_at: null,
  quiz_hash: "local-hash",
  last_synced_version: 1,
  last_synced_at: null,
};

const {
  dbMock,
  quizzesData,
  toRemoteQuizMock,
  upsertQuizzesMock,
  fetchUserQuizzesMock,
  resolveConflictMock,
} = vi.hoisted(() => {
  const quizzesData: Quiz[] = [];
  const toArray = vi.fn();
  const bulkPut = vi.fn();
  const get = vi.fn();
  const bulkGet = vi.fn().mockImplementation(async (ids: string[]) => {
    return ids.map((id) => quizzesData.find((q) => q.id === id));
  });
  const where = vi.fn().mockReturnValue({
    equals: vi.fn().mockImplementation((userId: string) => ({
      toArray: vi
        .fn()
        .mockImplementation(async () =>
          quizzesData.filter((quiz) => quiz.user_id === userId),
        ),
    })),
  });

  const db = {
    quizzes: {
      toArray,
      bulkPut,
      get,
      bulkGet,
      where,
    },
  };

  return {
    dbMock: db,
    quizzesData,
    toRemoteQuizMock: vi
      .fn()
      .mockImplementation(async (_userId: string, quiz: Quiz) => ({
        id: quiz.id,
        user_id: quiz.user_id ?? _userId,
        title: quiz.title,
        description: quiz.description,
        tags: quiz.tags,
        version: quiz.version,
        questions: quiz.questions,
        quiz_hash: quiz.quiz_hash,
        created_at: new Date(quiz.created_at).toISOString(),
        updated_at: new Date(quiz.updated_at ?? quiz.created_at).toISOString(),
        deleted_at: null,
      })),
    upsertQuizzesMock: vi.fn().mockResolvedValue({ error: null }),
    fetchUserQuizzesMock: vi.fn().mockResolvedValue({ data: [], error: null }),
    resolveConflictMock: vi
      .fn()
      .mockImplementation((_local, remote: Quiz) => ({
        winner: "remote",
        merged: remote,
      })),
  };
});

vi.mock("@/db", () => ({
  db: dbMock,
  NIL_UUID: "00000000-0000-0000-0000-000000000000",
}));

vi.mock("@/db/syncState", () => ({
  getQuizSyncCursor: vi
    .fn()
    .mockResolvedValue({
      timestamp: "1970-01-01T00:00:00.000Z",
      lastId: "00000000-0000-0000-0000-000000000000",
    }),
  setQuizSyncCursor: vi.fn().mockResolvedValue(undefined),
  getQuizBackfillState: vi.fn().mockResolvedValue(true),
  setQuizBackfillDone: vi.fn().mockResolvedValue(undefined),
  getSyncBlockState: vi.fn().mockResolvedValue(null), // Not blocked by default
  setSyncBlockState: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/sync/quizRemote", () => ({
  fetchUserQuizzes: fetchUserQuizzesMock,
  upsertQuizzes: upsertQuizzesMock,
}));

vi.mock("@/lib/sync/quizDomain", () => ({
  computeQuizHash: vi.fn().mockResolvedValue("hash"),
  resolveQuizConflict: resolveConflictMock,
  toLocalQuiz: vi.fn().mockImplementation(async (remote) => ({
    id: remote.id,
    user_id: remote.user_id,
    title: remote.title,
    description: remote.description ?? "",
    created_at: 1704067200000,
    updated_at: 1704067200000,
    tags: remote.tags ?? [],
    questions: remote.questions ?? [],
    version: remote.version,
    deleted_at: remote.deleted_at ? 1704067200000 : null,
    quiz_hash: remote.quiz_hash ?? null,
    last_synced_at: null,
    last_synced_version: null,
  })),
  toRemoteQuiz: toRemoteQuizMock,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: (): typeof supabaseMock => supabaseMock,
}));

describe("quizSyncManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchUserQuizzesMock.mockReset();
    fetchUserQuizzesMock.mockResolvedValue({ data: [], error: null });

    quizzesData.length = 0;
    quizzesData.push(sampleQuiz);
    dbMock.quizzes.get.mockResolvedValue(undefined);
    dbMock.quizzes.bulkPut.mockResolvedValue(undefined);
    resolveConflictMock.mockReturnValue({
      winner: "remote",
      merged: { ...sampleQuiz },
    });
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_TIMESTAMP);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("pushes dirty quizzes and updates sync metadata", async () => {
    await syncQuizzes("user-1");

    expect(toRemoteQuizMock).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ id: sampleQuiz.id }),
    );
    expect(upsertQuizzesMock).toHaveBeenCalledWith("user-1", expect.any(Array));
    expect(dbMock.quizzes.bulkPut).toHaveBeenCalled();

    const updatedRecord = dbMock.quizzes.bulkPut.mock.calls[0]?.[0]?.[0] as
      | Quiz
      | undefined;
    expect(updatedRecord?.last_synced_version).toBe(sampleQuiz.version);
    expect(updatedRecord?.last_synced_at).toBe(FIXED_TIMESTAMP);
  });

  it("acquires web lock before syncing quizzes", async () => {
    const lockRequest = vi
      .fn()
      .mockImplementation(async (_name, _options, callback) =>
        callback({ name: "sync-quizzes-user-1" }),
      );
    vi.stubGlobal("navigator", { locks: { request: lockRequest } });
    quizzesData.length = 0;

    await syncQuizzes("user-1");

    expect(lockRequest).toHaveBeenCalledWith(
      "sync-quizzes-user-1",
      { ifAvailable: true },
      expect.any(Function),
    );
  });

  it("only pushes quizzes for the active user", async () => {
    quizzesData.push({
      ...sampleQuiz,
      id: "quiz-2",
      user_id: "user-2",
      last_synced_version: 1,
      version: 3,
    });

    await syncQuizzes("user-1");

    expect(toRemoteQuizMock).toHaveBeenCalledTimes(1);
    expect(toRemoteQuizMock).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ id: sampleQuiz.id }),
    );
  });

  it("stores pulled quizzes with the active user_id", async () => {
    fetchUserQuizzesMock.mockResolvedValueOnce({
      data: [
        {
          id: "remote-quiz",
          user_id: "user-1",
          title: "Remote Quiz",
          description: "",
          tags: [],
          version: 1,
          questions: [],
          quiz_hash: "remote-hash",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        },
      ],
      error: null,
    });
    resolveConflictMock.mockReturnValue({
      winner: "remote",
      merged: { ...sampleQuiz, id: "remote-quiz", user_id: "user-1" },
    });

    await syncQuizzes("user-1");

    expect(dbMock.quizzes.bulkPut).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: "remote-quiz", user_id: "user-1" }),
      ]),
    );
  });

  it("advances cursor using the last valid record even when some remote quizzes are invalid", async () => {
    const batchOne = Array.from({ length: 50 }, (_value, index) => ({
      id: `remote-${index}`,
      user_id: "user-1",
      title: `Remote ${index}`,
      description: "",
      tags: [],
      version: 1,
      questions: [],
      quiz_hash: null,
      created_at: new Date().toISOString(),
      updated_at: "2024-01-01T00:00:00.000Z",
      deleted_at: null,
    }));
    batchOne[10] = {
      // Missing id and invalid updated_at should be skipped but still advance cursor to the next batch
      id: undefined as unknown as string,
      user_id: "user-1",
      title: "Invalid quiz",
      description: "",
      tags: [],
      version: 1,
      questions: [],
      quiz_hash: null,
      created_at: new Date().toISOString(),
      updated_at: "invalid-date",
      deleted_at: null,
    };

    fetchUserQuizzesMock
      .mockResolvedValueOnce({
        data: batchOne,
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: "remote-2",
            user_id: "user-1",
            title: "Remote 2",
            description: "",
            tags: [],
            version: 2,
            questions: [],
            quiz_hash: null,
            created_at: new Date().toISOString(),
            updated_at: "2024-01-02T00:00:00.000Z",
            deleted_at: null,
          },
        ],
        error: null,
      })
      .mockResolvedValue({ data: [], error: null });

    await syncQuizzes("user-1");

    expect(setQuizSyncCursor).toHaveBeenLastCalledWith(
      "2024-01-02T00:00:00.000Z",
      "user-1",
      "remote-2",
    );
  });

  it("propagates remote soft-deletes and keeps local soft-deletes unless revived by newer data", async () => {
    const deletedRemote = {
      id: "remote-deleted",
      user_id: "user-1",
      title: "Remote Deleted",
      description: "",
      tags: [],
      version: 3,
      questions: [],
      quiz_hash: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: new Date().toISOString(),
    };

    quizzesData.length = 0;
    quizzesData.push({
      ...sampleQuiz,
      id: "local-deleted",
      deleted_at: Date.now(),
      version: 4,
    });

    fetchUserQuizzesMock
      .mockResolvedValueOnce({ data: [deletedRemote], error: null })
      .mockResolvedValueOnce({
        data: [
          {
            id: "local-deleted",
            user_id: "user-1",
            title: "Local Soft Deleted",
            description: "",
            tags: [],
            version: 3,
            questions: [],
            quiz_hash: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
          },
        ],
        error: null,
      })
      .mockResolvedValue({ data: [], error: null });

    resolveConflictMock
      .mockReturnValueOnce({
        winner: "remote",
        merged: { ...sampleQuiz, id: deletedRemote.id, deleted_at: Date.now() },
      })
      .mockReturnValueOnce({
        winner: "local",
        merged: {
          ...sampleQuiz,
          id: "local-deleted",
          deleted_at: quizzesData[0]!.deleted_at,
        },
      });

    await syncQuizzes("user-1");

    const savedQuizzes = dbMock.quizzes.bulkPut.mock.calls.flat(2) as Quiz[];
    expect(savedQuizzes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "remote-deleted",
          deleted_at: expect.any(Number),
        }),
        expect.objectContaining({
          id: "local-deleted",
          deleted_at: expect.any(Number),
        }),
      ]),
    );
  });

  it("should halt sync and set block state when all quizzes in a batch are invalid (schema drift)", async () => {
    // Clear local quizzes to prevent push phase interference
    quizzesData.length = 0;

    // Mock 50 invalid quizzes (missing required fields like version, questions)
    const invalidQuizzes = Array(50)
      .fill(null)
      .map((_, i) => ({
        id: `invalid-${i}`,
        user_id: "user-1",
        title: `Invalid Quiz ${i}`,
        // Missing: version, questions, tags, etc.
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }));

    fetchUserQuizzesMock.mockResolvedValueOnce({
      data: invalidQuizzes,
      error: null,
    });

    // Get the mocked functions
    const syncStateMock = await import("@/db/syncState");

    const result = await syncQuizzes("user-1");

    // Should report incomplete
    expect(result.incomplete).toBe(true);

    // setQuizSyncCursor should NOT have been called (cursor should not advance)
    expect(syncStateMock.setQuizSyncCursor).not.toHaveBeenCalled();

    // setSyncBlockState should have been called to prevent retry-hammering
    expect(syncStateMock.setSyncBlockState).toHaveBeenCalledWith(
      "user-1",
      "quizzes",
      "schema_drift",
    );
  });

  it("should skip sync when block state is set", async () => {
    // Clear local quizzes to prevent push phase interference
    quizzesData.length = 0;

    // Mock a blocked state
    const syncStateMock = await import("@/db/syncState");
    vi.mocked(syncStateMock.getSyncBlockState).mockResolvedValueOnce({
      reason: "schema_drift",
      blockedAt: Date.now() - 1000, // 1 second ago
      ttlMs: 6 * 60 * 60 * 1000, // 6 hours
    });

    const result = await syncQuizzes("user-1");

    // Should report incomplete (blocked)
    expect(result.incomplete).toBe(true);

    // Should not have attempted to fetch
    expect(fetchUserQuizzesMock).not.toHaveBeenCalled();
  });
});
