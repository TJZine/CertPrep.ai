"use client";

import { db } from "@/db";
import { NIL_UUID } from "@/lib/constants";
import {
  getQuizBackfillState,
  getQuizSyncCursor,
  setQuizBackfillDone,
  setQuizSyncCursor,
  getSyncBlockState,
  setSyncBlockState,
} from "@/db/syncState";
import { logger } from "@/lib/logger";
import {
  computeQuizHash,
  resolveQuizConflict,
  toLocalQuiz,
  toRemoteQuiz,
} from "./quizDomain";
import { logNetworkAwareSlowSync } from "@/lib/sync/syncLogging";
import { fetchUserQuizzes, upsertQuizzes } from "./quizRemote";
import type { Quiz } from "@/types/quiz";
import { QuestionSchema } from "@/validators/quizSchema";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

let supabaseInstance: SupabaseClient | undefined;

function getSupabaseClient(): SupabaseClient | undefined {
  if (!supabaseInstance) {
    supabaseInstance = createClient();
  }
  return supabaseInstance;
}

async function ensureQuizHash(
  quiz: Quiz,
  payloadHash?: string | null,
): Promise<string> {
  return (
    payloadHash ??
    quiz.quiz_hash ??
    (await computeQuizHash({
      title: quiz.title,
      description: quiz.description,
      tags: quiz.tags,
      questions: quiz.questions,
    }))
  );
}

const BATCH_SIZE = 50;
const TIME_BUDGET_MS = 5000;

// Using .passthrough() to preserve unknown fields from newer schema versions
const RemoteQuizSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  version: z.number().int(),
  questions: z.array(QuestionSchema),
  quiz_hash: z.string().nullable().optional(),
  source_id: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
  category: z.string().nullable().optional(),
  subcategory: z.string().nullable().optional(),
}).passthrough();

const syncState = {
  isSyncing: false,
  lastSyncAttempt: 0,
};

export async function syncQuizzes(
  userId: string,
): Promise<{ incomplete: boolean }> {
  if (!userId) return { incomplete: false };

  if (typeof navigator !== "undefined" && "locks" in navigator) {
    try {
      return (
        (await navigator.locks.request(
          `sync-quizzes-${userId}`,
          { ifAvailable: true },
          async (lock) => {
            if (!lock) {
              logger.debug(
                "Quiz sync already in progress in another tab, skipping",
              );
              return { incomplete: false };
            }
            try {
              return await performQuizSync(userId);
            } catch (error) {
              logger.error("Quiz sync failed while holding lock", error);
              return { incomplete: true };
            }
          },
        )) || { incomplete: false }
      );
    } catch (error) {
      logger.error("Failed to acquire quiz sync lock request", error);
      return { incomplete: true };
    }
  }

  if (syncState.isSyncing) {
    if (Date.now() - syncState.lastSyncAttempt > 30000) {
      logger.warn("Quiz sync lock timed out, resetting");
      syncState.isSyncing = false;
    } else {
      return { incomplete: false };
    }
  }

  syncState.isSyncing = true;
  syncState.lastSyncAttempt = Date.now();
  try {
    return await performQuizSync(userId);
  } catch (error) {
    logger.error("Quiz sync failed (fallback path)", error);
    return { incomplete: true };
  } finally {
    syncState.isSyncing = false;
  }
}

async function performQuizSync(
  userId: string,
): Promise<{ incomplete: boolean }> {
  performance.mark("quizSync-start");
  const startTime = Date.now();
  let incomplete = false;
  const stats = { pushed: 0, pulled: 0 };

  // Check if sync is blocked due to previous schema drift
  const blockState = await getSyncBlockState(userId, "quizzes");
  if (blockState) {
    const remainingMs = blockState.ttlMs - (Date.now() - blockState.blockedAt);
    const remainingMins = Math.ceil(remainingMs / 60000);
    logger.debug("Quiz sync blocked due to previous failure", {
      userId,
      reason: blockState.reason,
      remainingMins,
    });
    return { incomplete: true };
  }

  // Validate auth session matches the userId we're syncing for
  const client = getSupabaseClient();
  if (!client) {
    logger.warn("Quiz sync skipped: Supabase client unavailable");
    return { incomplete: true };
  }

  const { data: { session }, error: authError } = await client.auth.getSession();
  if (authError || !session?.user) {
    logger.warn("Quiz sync skipped: No valid auth session", { authError: authError?.message });
    return { incomplete: true };
  }
  if (session.user.id !== userId) {
    logger.error("Quiz sync aborted: Auth user ID mismatch", { authUserId: session.user.id, syncUserId: userId });
    return { incomplete: true };
  }

  try {
    const backfillComplete = await getQuizBackfillState(userId);
    if (!backfillComplete) {
      await backfillLocalQuizzes(userId);
    }

    if (Date.now() - startTime > TIME_BUDGET_MS) {
      return { incomplete: true };
    }

    incomplete =
      (await pushLocalChanges(userId, startTime, stats)) || incomplete;

    if (Date.now() - startTime > TIME_BUDGET_MS) {
      return { incomplete: true };
    }

    const pullResult = await pullRemoteChanges(userId, startTime, stats);
    incomplete = pullResult.incomplete || incomplete;

    if (pullResult.hardFailure) {
      // Schema drift is a hard failure that requires intervention, so we treat it differently.
      logger.warn("Quiz sync halted due to schema drift", {
        userId,
        pushed: stats.pushed,
        pulled: stats.pulled,
        incomplete: true,
      });
    } else if (incomplete) {
      logger.info("Quiz sync finished incomplete", {
        userId,
        pushed: stats.pushed,
        pulled: stats.pulled,
        incomplete: true,
      });
    } else {
      logger.info("Quiz sync complete", {
        userId,
        pushed: stats.pushed,
        pulled: stats.pulled,
        incomplete: false,
      });
    }
    return { incomplete };
  } finally {
    performance.mark("quizSync-end");
    performance.measure("quizSync", "quizSync-start", "quizSync-end");
    const duration = Date.now() - startTime;
    if (duration > 300) {
      logNetworkAwareSlowSync("Quiz sync", {
        duration,
        pushed: stats.pushed,
        pulled: stats.pulled,
      });
    }
  }
}

async function backfillLocalQuizzes(userId: string): Promise<void> {
  const quizzes = await db.quizzes.where("user_id").equals(userId).toArray();

  if (quizzes.length === 0) {
    await setQuizBackfillDone(userId);
    return;
  }

  const startTime = Date.now();
  let hasErrors = false;

  for (let i = 0; i < quizzes.length; i += BATCH_SIZE) {
    if (Date.now() - startTime > TIME_BUDGET_MS) {
      logger.warn("Quiz backfill time budget exceeded, pausing.");
      return;
    }

    const batch = quizzes.slice(i, i + BATCH_SIZE);
    const payload = await Promise.all(
      batch.map((quiz) => toRemoteQuiz(userId, quiz)),
    );
    const { error } = await upsertQuizzes(userId, payload);

    if (error) {
      logger.error("Failed to backfill quizzes to Supabase", {
        userId,
        error,
        batchIndex: i,
        batchSize: batch.length,
      });
      hasErrors = true;
      continue; // Try next batch or abort? Continuing allows partial progress.
    }

    const now = Date.now();
    const updated = await Promise.all(
      batch.map(async (quiz, index) => ({
        ...quiz,
        user_id: userId,
        quiz_hash: await ensureQuizHash(quiz, payload[index]?.quiz_hash),
        last_synced_version: quiz.version,
        last_synced_at: now,
      })),
    );

    await db.quizzes.bulkPut(updated);
  }

  if (!hasErrors) {
    await setQuizBackfillDone(userId);
  }
}

async function pushLocalChanges(
  userId: string,
  startTime: number,
  stats: { pushed: number },
): Promise<boolean> {
  let incomplete = false;
  const userQuizzes = await db.quizzes
    .where("user_id")
    .equals(userId)
    .toArray();
  const dirtyQuizzes = userQuizzes.filter(
    (quiz) =>
      quiz.user_id === userId &&
      quiz.user_id !== NIL_UUID &&
      (quiz.last_synced_version ?? null) !== quiz.version,
  );


  for (let i = 0; i < dirtyQuizzes.length; i += BATCH_SIZE) {
    if (Date.now() - startTime > TIME_BUDGET_MS) {
      logger.warn("Quiz sync time budget exceeded during push");
      incomplete = true;
      break;
    }

    const batch = dirtyQuizzes.slice(i, i + BATCH_SIZE);
    const remotePayload = await Promise.all(
      batch.map((quiz) => toRemoteQuiz(userId, quiz)),
    );
    const { error } = await upsertQuizzes(userId, remotePayload);


    if (error) {
      logger.error("Failed to push local quizzes to Supabase", {
        userId,
        error,
      });
      incomplete = true;
      continue;
    }

    const now = Date.now();
    const updatedBatch: Quiz[] = await Promise.all(
      batch.map(async (quiz, index) => ({
        ...quiz,
        quiz_hash: await ensureQuizHash(quiz, remotePayload[index]?.quiz_hash),
        last_synced_version: quiz.version,
        last_synced_at: now,
      })),
    );

    await db.quizzes.bulkPut(updatedBatch);
    stats.pushed += updatedBatch.length;
  }

  return incomplete;
}

async function pullRemoteChanges(
  userId: string,
  startTime: number,
  stats: { pulled: number },
): Promise<{ incomplete: boolean; hardFailure: boolean }> {
  let incomplete = false;
  let hardFailure = false;
  let hasMore = true;

  while (hasMore) {
    if (Date.now() - startTime > TIME_BUDGET_MS) {
      logger.warn("Quiz sync time budget exceeded during pull");
      incomplete = true;
      break;
    }

    const cursor = await getQuizSyncCursor(userId);
    const { data: remoteQuizzes, error } = await fetchUserQuizzes({
      userId,
      updatedAfter: cursor.timestamp,
      lastId: cursor.lastId,
      limit: BATCH_SIZE,
    });

    if (error) {
      logger.error("Failed to pull quizzes from Supabase", { userId, error });
      incomplete = true;
      break;
    }

    if (!remoteQuizzes || remoteQuizzes.length === 0) {
      break;
    }

    const quizzesToSave: Quiz[] = [];
    // Track last item seen (including invalid) to avoid reprocessing
    let lastSeenTimestamp = cursor.timestamp;
    let lastSeenId = cursor.lastId;

    // Track last valid item for normal cursor advancement
    let lastCursorTimestamp = cursor.timestamp;
    let lastCursorId = cursor.lastId;
    let sawInvalid = false;
    let sawValid = false;
    const now = Date.now();

    // 1. Pre-process and validate remote quizzes to collect IDs
    interface ValidatedRemote {
      remote: Quiz;
      originalUpdatedAt: string;
      originalId: string;
    }
    const validatedBatch: ValidatedRemote[] = [];
    const remoteIds: string[] = [];

    for (const remoteQuiz of remoteQuizzes) {
      const rawUpdatedAt = (remoteQuiz as { updated_at?: unknown }).updated_at;
      let candidateUpdatedAt: string;

      if (
        typeof rawUpdatedAt === "string" &&
        !Number.isNaN(Date.parse(rawUpdatedAt))
      ) {
        candidateUpdatedAt = new Date(rawUpdatedAt).toISOString();
      } else {
        logger.error(
          "Invalid updated_at in remote quiz, advancing cursor to skip record",
          { quizId: remoteQuiz.id, rawUpdatedAt, userId },
        );
        const safeLastUpdate = !Number.isNaN(Date.parse(lastSeenTimestamp))
          ? new Date(lastSeenTimestamp).getTime()
          : 0;
        candidateUpdatedAt = new Date(
          Math.max(safeLastUpdate + 1, Date.now()),
        ).toISOString();
      }
      lastSeenTimestamp = candidateUpdatedAt;

      const candidateId =
        typeof (remoteQuiz as { id?: unknown }).id === "string"
          ? (remoteQuiz as { id: string }).id
          : null; // Do not fallback to cursor.lastId, as that corrupts identity

      if (!candidateId) {
        logger.error(
          "Invalid id in remote quiz, advancing cursor to skip record",
          { rawId: (remoteQuiz as { id?: unknown }).id, userId },
        );
        lastSeenId = "skip-invalid-id-" + Date.now(); // Synthetic ID to ensure progress
      } else {
        lastSeenId = candidateId;
      }

      const validation = RemoteQuizSchema.safeParse({
        ...remoteQuiz,
        updated_at: candidateUpdatedAt,
        id: candidateId ?? "invalid-id-placeholder", // Will fail validation below
      });

      if (!validation.success) {
        logger.warn("Skipping invalid remote quiz record", {
          id: candidateId ?? "unknown",
          error: validation.error,
        });
        sawInvalid = true;
        continue;
      }

      const mappedRemote = await toLocalQuiz(validation.data);
      const remoteWithUser: Quiz = { ...mappedRemote, user_id: userId };
      sawValid = true;
      lastCursorTimestamp = candidateUpdatedAt;
      lastCursorId = candidateId ?? "unknown-id"; // Fallback should not happen due to validation, but satisfies TS

      validatedBatch.push({
        remote: remoteWithUser,
        originalUpdatedAt: candidateUpdatedAt,
        originalId: candidateId ?? "unknown-id",
      });
      remoteIds.push(mappedRemote.id);
    }

    // 2. Batch fetch local quizzes to avoid N+1
    const localQuizzes = await db.quizzes.bulkGet(remoteIds);
    const localQuizMap = new Map<string, Quiz>();
    localQuizzes.forEach((q) => {
      if (q) localQuizMap.set(q.id, q);
    });

    // 3. Process conflicts and prepare save batch
    for (const { remote } of validatedBatch) {
      const localQuiz = localQuizMap.get(remote.id);

      if (localQuiz && localQuiz.user_id !== userId) {
        logger.error("Skipping remote quiz due to user mismatch", {
          quizId: remote.id,
          userId,
        });
        continue;
      }

      const { winner, merged } = resolveQuizConflict(localQuiz, remote);

      const mergedWithSync: Quiz = {
        ...merged,
        user_id: userId,
        quiz_hash: merged.quiz_hash ?? remote.quiz_hash ?? null,
        last_synced_version:
          winner === "remote"
            ? remote.version
            : (localQuiz?.last_synced_version ?? null),
        last_synced_at:
          winner === "remote"
            ? now
            : (localQuiz?.last_synced_at ?? merged.last_synced_at ?? null),
      };

      quizzesToSave.push(mergedWithSync);
    }

    if (quizzesToSave.length > 0) {
      await db.quizzes.bulkPut(quizzesToSave);
      stats.pulled += quizzesToSave.length;
    }

    // If we only saw invalid items, this indicates schema drift.
    // HALT sync without advancing cursor and set block state.
    if (!sawValid && sawInvalid) {
      logger.error(
        "All remote quizzes failed validation - schema drift detected. Halting sync.",
        {
          userId,
          batchSize: remoteQuizzes.length,
          lastSeenTimestamp,
          lastSeenId,
        },
      );
      incomplete = true;
      hardFailure = true;
      // Set block state to prevent retry-hammering (6 hour default TTL)
      await setSyncBlockState(userId, "quizzes", "schema_drift");
      break; // Exit loop WITHOUT advancing cursor
    }

    // Mixed valid/invalid: advance cursor past last seen to avoid reprocessing
    if (sawValid && sawInvalid) {
      logger.warn(
        "Mixed valid/invalid remote quizzes; advancing cursor past last seen item",
        {
          userId,
          lastSeenTimestamp,
          lastSeenId,
        },
      );
      lastCursorTimestamp = lastSeenTimestamp;
      lastCursorId = lastSeenId;
    }

    await setQuizSyncCursor(lastCursorTimestamp, userId, lastCursorId);

    if (remoteQuizzes.length < BATCH_SIZE) {
      hasMore = false;
    }
  }

  return { incomplete, hardFailure };
}
