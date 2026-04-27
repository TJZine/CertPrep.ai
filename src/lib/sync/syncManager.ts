"use client";

import { db } from "@/db";
import { logger } from "@/lib/logger";
import { readAndRepairResultsSyncCursor, setSyncCursor } from "@/db/syncState";
import { createClient } from "@/lib/supabase/client";
import { logNetworkAwareSlowSync } from "@/lib/sync/syncLogging";
import { safeMark, safeMeasure } from "@/lib/perfMarks";
import type { Result } from "@/types/result";
import {
  PERSISTED_RESULT_MODES,
  parseSessionType,
} from "@/types/result";
import { z } from "zod";
import type { Database } from "@/types/database.types";
import {
  createSupabaseClientGetter,
  failedSyncOutcome,
  isNonRetryableAuthSyncError,
  skippedSyncOutcome,
  syncedSyncOutcome,
  toErrorMessage,
  toSafeCursorTimestamp,
  type SyncRunnerOutcome,
} from "./shared";

const getSupabaseClient = createSupabaseClientGetter(() => createClient());
const BATCH_SIZE = 50;
const TIME_BUDGET_MS = 5000;

// Schema for validating remote result data structure
// Using .passthrough() to preserve unknown fields from newer schema versions
export const RemoteResultSchema = z.object({
  id: z.string(),
  quiz_id: z.string(),
  timestamp: z.coerce.number(), // Coerce string (from Postgres bigint) to number
  mode: z.enum(PERSISTED_RESULT_MODES),
  score: z.coerce.number().int().min(0),
  time_taken_seconds: z.coerce.number().min(0),
  answers: z.record(z.string(), z.string()),
  flagged_questions: z.array(z.string()).nullable().optional().transform(v => v ?? []),
  category_breakdown: z.record(z.string(), z.number()).nullable().optional().transform(v => v ?? {}),
  question_ids: z.array(z.string()).optional().nullable(),
  computed_category_scores: z.record(z.string(), z.object({ correct: z.number(), total: z.number() })).nullable().optional(),
  difficulty_ratings: z.record(z.string(), z.union([z.literal(1), z.literal(2), z.literal(3)])).nullable().optional(),
  time_per_question: z.record(z.string(), z.number()).nullable().optional(),
  session_type: z.string().nullable().optional().transform(parseSessionType),
  source_map: z.record(z.string(), z.string()).nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable().optional(), // For cross-device deletion sync
}).passthrough();

const syncState = {
  isSyncing: false,
  lastSyncAttempt: 0,
};

export type SyncResultsOutcome = SyncRunnerOutcome;

export async function syncResults(userId: string): Promise<SyncResultsOutcome> {
  if (!userId) return skippedSyncOutcome();

  // Optimization: Don't attempt sync if browser is offline
  if (typeof navigator !== "undefined") {
    logger.debug(`[Sync] Checking online status: ${navigator.onLine}`);
    if (!navigator.onLine) {
      logger.debug("Browser is offline, skipping sync");
      return skippedSyncOutcome({
        incomplete: true,
        error: "Offline",
        shouldRetry: true,
      });
    }
  }

  // Use Web Locks API for cross-tab synchronization safety
  if (typeof navigator !== "undefined" && "locks" in navigator) {
    try {
      return (
        (await navigator.locks.request(
          `sync-results-${userId}`,
          { ifAvailable: true },
          async (lock) => {
            if (!lock) {
              logger.debug("Sync already in progress in another tab, skipping");
              return skippedSyncOutcome({
                shouldRetry: true,
              });
            }
            try {
              return await performSync(userId);
            } catch (error) {
              logger.error("Results sync failed while holding lock", error);
              return failedSyncOutcome({
                error: toErrorMessage(error),
              });
            }
          },
        )) ??
        failedSyncOutcome({
          error: "Results sync lock request returned no outcome",
        })
      );
    } catch (error) {
      logger.error("Failed to acquire sync lock:", toErrorMessage(error));
      return failedSyncOutcome({
        error: toErrorMessage(error),
      });
    }
  } else {
    // Fallback for environments without Web Locks
    if (syncState.isSyncing) {
      if (Date.now() - syncState.lastSyncAttempt > 15000) {
        logger.warn("Sync lock timed out, resetting...");
        syncState.isSyncing = false;
      } else {
        return skippedSyncOutcome({
          shouldRetry: true,
        });
      }
    }
    syncState.isSyncing = true;
    syncState.lastSyncAttempt = Date.now();
    try {
      return await performSync(userId);
    } catch (error) {
      logger.error("Result sync failed (fallback path)", error);
      return failedSyncOutcome({
        error: toErrorMessage(error),
      });
    } finally {
      syncState.isSyncing = false;
    }
  }
}

async function performSync(userId: string): Promise<SyncResultsOutcome> {
  safeMark("syncResults-start");
  let incomplete = false;
  const startTime = Date.now();
  let pushed = 0;
  let pulled = 0;
  let lastError: string | undefined;
  let shouldRetry = true;

  const client = getSupabaseClient();
  if (!client) {
    return failedSyncOutcome({
      error: "Supabase client unavailable",
    });
  }

  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) {
    logger.warn("Sync skipped: No valid auth session", { authError: authError?.message });
    return skippedSyncOutcome({
      incomplete: true,
      error: "Not authenticated",
      shouldRetry: true,
    });
  }
  if (user.id !== userId) {
    logger.error("Sync aborted: Auth user ID mismatch", { authUserId: user.id, syncUserId: userId });
    return failedSyncOutcome({
      error: "User ID mismatch - please re-login",
      shouldRetry: false,
    });
  }

  try {
    // 1. PUSH: Upload unsynced local results to Supabase
    const unsyncedResults = await db.results
      .where("[user_id+synced]")
      .equals([userId, 0])
      .toArray();

    if (unsyncedResults.length > 0) {
      // Pre-Flight FK Validation: Only push results whose quiz has been synced.
      // This prevents FK constraint violations when a result references a newly-created
      // quiz (like SRS quiz) that hasn't synced to Supabase yet.
      const quizIds = [...new Set(unsyncedResults.map((r) => r.quiz_id))];
      const quizzes = await db.quizzes.bulkGet(quizIds);
      const syncedQuizIds = new Set(
        quizzes
          .filter((q): q is NonNullable<typeof q> => q !== undefined && q.last_synced_at != null)
          .map((q) => q.id),
      );

      const syncableResults = unsyncedResults.filter((r) => syncedQuizIds.has(r.quiz_id));
      const skippedCount = unsyncedResults.length - syncableResults.length;


      if (skippedCount > 0) {
        logger.debug("Skipping results with unsynced quizzes (FK pre-flight)", {
          userId,
          skippedCount,
          totalUnsynced: unsyncedResults.length,
          syncable: syncableResults.length,
        });
      }

      for (let i = 0; i < syncableResults.length; i += BATCH_SIZE) {
        if (Date.now() - startTime > TIME_BUDGET_MS) {
          logger.warn(`Sync time budget exceeded (${TIME_BUDGET_MS}ms) during PUSH, pausing.`);
          incomplete = true;
          lastError = "Result sync push time budget exceeded";
          break;
        }

        const batch = syncableResults.slice(i, i + BATCH_SIZE);

        // Unified upsert payload handling both active and soft-deleted records
        const payload = buildSyncPayload(batch, userId);

        const { error } = await client.from("results").upsert(
          payload,
          { onConflict: "id" },
        );


        if (error) {
          const errorMsg = toErrorMessage(error);
          logger.error("Failed to push results batch to Supabase:", errorMsg, { code: error.code });
          incomplete = true;
          lastError = errorMsg;
          shouldRetry = shouldRetry && !isNonRetryableAuthSyncError(error);

          const code = error.code;
          const status = (error as unknown as { status?: number }).status;

          if (
            code === "PGRST301" ||
            code === "429" ||
            code === "401" ||
            status === 429 ||
            status === 401 ||
            status === 500 ||
            status === 503
          ) {
            logger.error(`Critical sync error detected (${code || status}). Aborting push.`);
            break;
          }
        } else {
          // Mark as synced locally
          await db.results.bulkUpdate(
            batch.map((r) => ({ key: r.id, changes: { synced: 1 } })),
          );
          pushed += batch.length;
        }
      }

      // If we skipped results, mark as incomplete so caller knows to retry.
      // NOTE: We do NOT return early here - the PULL phase must still run
      // to receive inbound updates. Returning early would block all inbound
      // sync if any result references an unsynced quiz.
      if (skippedCount > 0) {
        incomplete = true;
        lastError ??= "Result sync skipped results with unsynced quizzes";
      }
    }

    // NOTE: Previously this would return early if incomplete, blocking PULL.
    // This was removed to prevent sync deadlock - pull should always run.

    // 2. PULL: Incremental Sync with Keyset Pagination using updated_at
    let hasMore = true;

    while (hasMore) {
      if (Date.now() - startTime > TIME_BUDGET_MS) {
        logger.warn(`Sync limit reached (time budget ${TIME_BUDGET_MS}ms), pausing.`);
        hasMore = false;
        incomplete = true;
        lastError = "Result sync pull time budget exceeded";
        break;
      }

      const cursor = await readAndRepairResultsSyncCursor(userId);
      const timestamp = cursor.timestamp;

      // Keyset pagination: (updated_at > ts) OR (updated_at = ts AND id > last_id)
      const filter = `updated_at.gt.${timestamp},and(updated_at.eq.${timestamp},id.gt.${cursor.lastId})`;

      const { data: remoteResults, error: fetchError } = await client
        .from("results")
        .select(
          "id, quiz_id, timestamp, mode, score, time_taken_seconds, answers, flagged_questions, category_breakdown, question_ids, computed_category_scores, difficulty_ratings, time_per_question, session_type, source_map, created_at, updated_at, deleted_at",
        )
        .eq("user_id", userId)
        .or(filter)
        .order("updated_at", { ascending: true })
        .order("id", { ascending: true })
        .limit(BATCH_SIZE);

      if (fetchError) {
        logger.error("Failed to fetch results from Supabase:", toErrorMessage(fetchError));
        incomplete = true;
        lastError = toErrorMessage(fetchError);
        hasMore = false;
        break;
      }

      if (!remoteResults || remoteResults.length === 0) {
        hasMore = false;
        break;
      }

      const resultsToSave: Result[] = [];
      const resultsToDelete: string[] = [];
      let lastRecordUpdatedAt = cursor.timestamp;
      let lastRecordId = cursor.lastId;
      let validRecordsInBatch = 0;

      for (const r of remoteResults) {
        if (!r) continue;

        const validation = RemoteResultSchema.safeParse(r);

        if (!validation.success) {
          logger.warn(`Skipping invalid remote result (ID: ${r.id}):`, {
            issues: validation.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", ")
          });
          continue;
        }

        const validResult = validation.data;

        // Handle remote deletions
        if (validResult.deleted_at) {
          resultsToDelete.push(validResult.id);
          lastRecordUpdatedAt = toSafeCursorTimestamp(r.updated_at, cursor.timestamp, {
            userId,
            resultId: r.id,
            path: "results-sync-deleted",
          });
          lastRecordId = r.id;
          validRecordsInBatch++;
          continue;
        }

        resultsToSave.push({
          id: validResult.id,
          user_id: userId,
          quiz_id: validResult.quiz_id,
          timestamp: validResult.timestamp,
          mode: validResult.mode,
          score: validResult.score,
          time_taken_seconds: validResult.time_taken_seconds,
          answers: validResult.answers,
          flagged_questions: validResult.flagged_questions,
          category_breakdown: validResult.category_breakdown,
          question_ids: validResult.question_ids || undefined,
          computed_category_scores: validResult.computed_category_scores || undefined,
          difficulty_ratings: validResult.difficulty_ratings || undefined,
          time_per_question: validResult.time_per_question || undefined,
          session_type: validResult.session_type || undefined,
          source_map: validResult.source_map || undefined,
          synced: 1,
        });

        // Track the last valid record for cursor advancement
        lastRecordUpdatedAt = toSafeCursorTimestamp(r.updated_at, cursor.timestamp, {
          userId,
          resultId: r.id,
          path: "results-sync-valid",
        });
        lastRecordId = r.id;
        validRecordsInBatch++;
      }

      if (remoteResults.length > 0 && validRecordsInBatch === 0) {
        const lastItem = remoteResults[remoteResults.length - 1];
        if (lastItem) {
          logger.error(
            `Batch of ${remoteResults.length} records all failed validation. Force-advancing cursor.`,
            { lastId: lastItem.id, lastUpdatedAt: lastItem.updated_at },
          );
          lastRecordUpdatedAt = toSafeCursorTimestamp(
            lastItem.updated_at,
            cursor.timestamp,
            {
              userId,
              resultId: lastItem.id,
              path: "results-sync-all-invalid",
            },
          );
          lastRecordId = lastItem.id;
        }
      }

      if (resultsToSave.length > 0) {
        await db.results.bulkPut(resultsToSave);
        pulled += resultsToSave.length;
      }

      if (resultsToDelete.length > 0) {
        // DECISION: Hard-delete intentionally chosen over soft-delete.
        // Rationale: Soft-deleting locally would allow offline devices to "resurrect"
        // deleted records when they sync, which is worse than data loss. The deletion
        // UI requires multi-step confirmation, so accidental deletion is not a concern.
        // Users have a right to permanently remove their data (GDPR erasure principle).
        await db.results.bulkDelete(resultsToDelete);
        logger.debug("Applied remote deletions locally", { count: resultsToDelete.length, userId });
      }

      const safeCursorTimestamp = toSafeCursorTimestamp(
        lastRecordUpdatedAt,
        cursor.timestamp,
        { userId, resultId: lastRecordId, path: "results-sync-final" },
      );
      await setSyncCursor(safeCursorTimestamp, userId, lastRecordId);

      if (remoteResults.length < BATCH_SIZE) {
        hasMore = false;
      }
    }
  } catch (error) {
    logger.error("Sync failed:", toErrorMessage(error));
    incomplete = true;
    lastError = toErrorMessage(error);
  } finally {
    safeMark("syncResults-end");
    safeMeasure("syncResults", "syncResults-start", "syncResults-end");
    const duration = Date.now() - startTime;
    if (duration > 300) {
      logNetworkAwareSlowSync("Result sync", { duration, pushed, pulled });
    }
  }

  if (incomplete) {
    logger.info("Result sync finished incomplete", {
      userId,
      pushed,
      pulled,
      incomplete: true,
      lastError,
    });
  } else {
    logger.info("Result sync complete", {
      userId,
      pushed,
      pulled,
      incomplete: false,
      lastError,
    });
  }
  return incomplete
    ? failedSyncOutcome({ error: lastError, shouldRetry })
    : syncedSyncOutcome();
}

export function buildSyncPayload(batch: Result[], userId: string): Database["public"]["Tables"]["results"]["Insert"][] {
  return batch.map((r) => ({
    id: r.id,
    user_id: userId,
    quiz_id: r.quiz_id,
    timestamp: r.timestamp,
    mode: r.mode,
    score: r.score,
    time_taken_seconds: r.time_taken_seconds,
    answers: r.answers,
    flagged_questions: r.flagged_questions,
    category_breakdown: r.category_breakdown,
    question_ids: r.question_ids,
    computed_category_scores: r.computed_category_scores,
    difficulty_ratings: r.difficulty_ratings,
    time_per_question: r.time_per_question,
    session_type: r.session_type,
    source_map: r.source_map,
    // Only include deleted_at if set (prevents resurrecting remotely deleted records)
    ...(r.deleted_at && { deleted_at: new Date(r.deleted_at).toISOString() }),
  })) as unknown as Database["public"]["Tables"]["results"]["Insert"][];
}
