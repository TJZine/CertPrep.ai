"use client";

import * as Sentry from "@sentry/nextjs";
import { db } from "@/db";
import {
  readAndRepairSRSSyncCursor,
  setSRSSyncCursor,
  getSyncBlockState,
  setSyncBlockState,
} from "@/db/syncState";
import { logger } from "@/lib/logger";
import { logNetworkAwareSlowSync } from "@/lib/sync/syncLogging";
import { createClient } from "@/lib/supabase/client";
import { safeMark, safeMeasure } from "@/lib/perfMarks";
import { z } from "zod";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SRSState } from "@/types/srs";
import {
  createSupabaseClientGetter,
  failedSyncOutcome,
  isNonRetryableAuthSyncError,
  skippedSyncOutcome,
  syncedSyncOutcome,
  toErrorMessage as toSharedErrorMessage,
  toSafeCursorTimestamp as toSharedSafeCursorTimestamp,
  type SyncRunnerOutcome,
} from "./shared";

const getSupabaseClient = createSupabaseClientGetter(() => createClient());
const toErrorMessage = (error: unknown): string =>
  toSharedErrorMessage(error, { style: "srs" });
const toSafeCursorTimestamp = (
  candidate: unknown,
  fallback: string,
  context: Record<string, unknown>,
): string =>
  toSharedSafeCursorTimestamp(candidate, fallback, context, {
    invalidCandidateMessage:
      "Invalid cursor timestamp encountered in SRS sync, using fallback",
    invalidFallbackMessage:
      "Invalid cursor timestamp and fallback in SRS sync; defaulting to epoch",
  });

const BATCH_SIZE = 50;
const TIME_BUDGET_MS = 5000;
const MAX_INVALID_BATCHES = 3;
const SRS_SYNC_TIME_BUDGET_ERROR = "SRS sync time budget exceeded";

// Schema for validating remote SRS data structure
// Using .passthrough() to preserve unknown fields from newer schema versions
const RemoteSRSSchema = z.object({
  question_id: z.string(),
  user_id: z.string(),
  box: z.number().min(1).max(5),
  last_reviewed: z.coerce.number(), // Coerce string (from Postgres bigint) to number
  next_review: z.coerce.number(),
  consecutive_correct: z.number().min(0),
  updated_at: z.string(),
}).passthrough();

const syncState = {
  isSyncing: false,
  lastSyncAttempt: 0,
};

export type SyncSRSOutcome = SyncRunnerOutcome;

type SRSPhaseOutcome = {
  incomplete: boolean;
  error?: string;
  shouldRetry?: boolean;
};

export async function syncSRS(userId: string): Promise<SyncSRSOutcome> {
  if (!userId) return skippedSyncOutcome();

  // Optimization: Don't attempt sync if browser is offline
  if (typeof navigator !== "undefined") {
    if (!navigator.onLine) {
      return skippedSyncOutcome({
        incomplete: true,
        error: "Offline",
        shouldRetry: true,
      });
    }
  }

  if (typeof navigator !== "undefined" && "locks" in navigator) {
    try {
      return (
        (await navigator.locks.request(
          `sync-srs-${userId}`,
          { ifAvailable: true },
          async (lock) => {
            if (!lock) {
              logger.debug("SRS sync already in progress in another tab, skipping");
              return skippedSyncOutcome({
                shouldRetry: true,
              });
            }
            try {
              return await performSRSSync(userId);
            } catch (error) {
              logger.error("SRS sync failed while holding lock", error);
              return failedSyncOutcome({
                error: toErrorMessage(error),
              });
            }
          },
        )) ??
        failedSyncOutcome({
          error: "SRS sync lock request returned no outcome",
        })
      );
    } catch (error) {
      logger.error("Failed to acquire SRS sync lock request", error);
      return failedSyncOutcome({
        error: toErrorMessage(error),
      });
    }
  }

  if (syncState.isSyncing) {
    if (Date.now() - syncState.lastSyncAttempt > 30000) {
      logger.warn("SRS sync lock timed out, resetting");
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
    return await performSRSSync(userId);
  } catch (error) {
    logger.error("SRS sync failed (fallback path)", error);
    return failedSyncOutcome({
      error: toErrorMessage(error),
    });
  } finally {
    syncState.isSyncing = false;
  }
}

async function performSRSSync(userId: string): Promise<SyncSRSOutcome> {
  safeMark("srsSync-start");
  const startTime = Date.now();
  let incomplete = false;
  let lastError: string | undefined;
  const stats = { pushed: 0, pulled: 0 };

  const client = getSupabaseClient();
  if (!client) {
    return failedSyncOutcome({
      error: "Supabase client unavailable",
    });
  }

  // Validate auth session matches the userId we're syncing for
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) {
    logger.warn("SRS sync skipped: No valid auth session", { authError: authError?.message });
    return skippedSyncOutcome({
      incomplete: true,
      error: "Not authenticated",
      shouldRetry: true,
    });
  }
  if (user.id !== userId) {
    logger.error("SRS sync aborted: Auth user ID mismatch", { authUserId: user.id, syncUserId: userId });
    return failedSyncOutcome({
      error: "User ID mismatch - please re-login",
      shouldRetry: false,
    });
  }

  // Check if sync is blocked due to previous schema drift
  const blockState = await getSyncBlockState(userId, "srs");
  if (blockState) {
    const remainingMs = blockState.ttlMs - (Date.now() - blockState.blockedAt);
    const remainingMins = Math.ceil(remainingMs / 60000);
    logger.debug("SRS sync blocked due to previous failure", {
      userId,
      reason: blockState.reason,
      remainingMins,
    });
    return failedSyncOutcome({
      error: blockState.reason,
      shouldRetry: false,
    });
  }

  try {
    if (Date.now() - startTime > TIME_BUDGET_MS) {
      lastError = SRS_SYNC_TIME_BUDGET_ERROR;
      return failedSyncOutcome({
        error: lastError,
      });
    }

    // Push phase - wrapped in Sentry span for performance monitoring
    const pushIncomplete = await Sentry.startSpan(
      { name: "srs.sync.push", op: "db.sync" },
      async () => await pushLocalChanges(userId, startTime, stats, client)
    );
    incomplete = pushIncomplete.incomplete || incomplete;
    if (pushIncomplete.error) {
      lastError = pushIncomplete.error;
      logger.warn("SRS sync push failed", {
        userId,
        error: pushIncomplete.error,
      });
    }

    if (Date.now() - startTime > TIME_BUDGET_MS) {
      lastError = SRS_SYNC_TIME_BUDGET_ERROR;
      return failedSyncOutcome({
        error: lastError,
      });
    }

    // Pull phase - wrapped in Sentry span for performance monitoring
    const pullResult = await Sentry.startSpan(
      { name: "srs.sync.pull", op: "db.sync" },
      async () => await pullRemoteChanges(userId, startTime, stats, client)
    );
    incomplete = pullResult.incomplete || incomplete;
    if (pullResult.error) {
      lastError = pullResult.error;
      logger.warn("SRS sync pull failed", {
        userId,
        error: pullResult.error,
      });
    }

    if (pullResult.hardFailure) {
      logger.warn("SRS sync halted due to schema drift", {
        userId,
        pushed: stats.pushed,
        pulled: stats.pulled,
      });
    } else {
      logger.info("SRS sync complete", {
        userId,
        pushed: stats.pushed,
        pulled: stats.pulled,
        incomplete,
      });
    }
    return incomplete
      ? failedSyncOutcome({
          error: lastError,
          shouldRetry: pushIncomplete.shouldRetry ?? true,
        })
      : syncedSyncOutcome();
  } finally {
    safeMark("srsSync-end");
    safeMeasure("srsSync", "srsSync-start", "srsSync-end");
    const duration = Date.now() - startTime;
    if (duration > 300) {
      logNetworkAwareSlowSync("SRS sync", {
        duration,
        pushed: stats.pushed,
        pulled: stats.pulled,
      });
    }
  }
}

async function pushLocalChanges(
  userId: string,
  startTime: number,
  stats: { pushed: number },
  client: SupabaseClient<Database>,
): Promise<SRSPhaseOutcome> {
  let incomplete = false;
  let errorMessage: string | undefined;
  let shouldRetry = true;

  // Find unsynced local SRS items
  // Index: [user_id+synced]
  const unsyncedItems = await db.srs
    .where("[user_id+synced]")
    .equals([userId, 0])
    .toArray();

  if (unsyncedItems.length === 0) return { incomplete: false };

  for (let i = 0; i < unsyncedItems.length; i += BATCH_SIZE) {
    if (Date.now() - startTime > TIME_BUDGET_MS) {
      logger.warn("SRS sync time budget exceeded during push");
      incomplete = true;
      errorMessage = SRS_SYNC_TIME_BUDGET_ERROR;
      break;
    }

    const batch = unsyncedItems.slice(i, i + BATCH_SIZE);

    // Prepare payload for batch RPC with LWW conflict resolution
    const payload = batch.map((item) => ({
      question_id: item.question_id,
      user_id: userId,
      box: item.box,
      last_reviewed: item.last_reviewed,
      next_review: item.next_review,
      consecutive_correct: item.consecutive_correct,
    }));

    const { data, error } = await client.rpc("upsert_srs_lww_batch", {
      items: payload,
    });

    if (error) {
      const errorMsg = toErrorMessage(error);
      logger.error("Failed to push SRS items via batch RPC", {
        userId,
        error: errorMsg,
      });
      incomplete = true;
      errorMessage = errorMsg;
      shouldRetry = shouldRetry && !isNonRetryableAuthSyncError(error);

      // Any batch error marks the push incomplete; the last batch error is reported.
      // Critical errors stop the push early, while non-critical batches keep trying.
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
        logger.error(`Critical SRS sync error (${code || status}). Aborting push.`);
        incomplete = true; // Mark as incomplete since we aborted
        break;
      }
      continue;
    }

    // Log how many were actually updated (server had older data)
    let updatedCount: number;
    if (Array.isArray(data)) {
      updatedCount = data.filter((r: { out_updated?: boolean }) => r.out_updated).length;
    } else {
      // Backward compat: assume all updated if no structured response
      logger.debug("SRS batch push: unstructured response, assuming all updated", {
        batchSize: batch.length,
      });
      updatedCount = batch.length;
    }
    if (updatedCount < batch.length) {
      logger.debug("SRS batch push: some items skipped (server had newer data)", {
        sent: batch.length,
        updated: updatedCount,
      });
    }

    // Mark as synced locally — only if server accepted (LWW reconciliation)
    await db.transaction("rw", db.srs, async () => {
      // Build set of question_ids that server actually updated
      const updatedIds = new Set(
        Array.isArray(data)
          ? data
            .filter((r: { out_updated?: boolean }) => r.out_updated)
            .map((r: { out_question_id?: string }) => r.out_question_id)
          : []
      );

      await Promise.all(
        batch.map((item) => {
          // Mark synced if: (1) server accepted, OR (2) no structured response (backward compat)
          if (updatedIds.has(item.question_id) || !Array.isArray(data)) {
            return db.srs.update([item.question_id, userId], { synced: 1 });
          }
          // Server had newer data — leave unsynced to trigger re-pull reconciliation
          return Promise.resolve();
        })
      );
    });
    stats.pushed += updatedCount;
  }

  return {
    incomplete,
    error: errorMessage,
    shouldRetry,
  };
}

async function pullRemoteChanges(
  userId: string,
  startTime: number,
  stats: { pulled: number },
  client: SupabaseClient<Database>,
): Promise<{ incomplete: boolean; hardFailure: boolean; error?: string }> {
  let incomplete = false;
  let hardFailure = false;
  let errorMessage: string | undefined;
  let hasMore = true;
  let consecutiveInvalidBatches = 0;

  while (hasMore) {
    if (Date.now() - startTime > TIME_BUDGET_MS) {
      logger.warn("SRS sync time budget exceeded during pull");
      incomplete = true;
      errorMessage = SRS_SYNC_TIME_BUDGET_ERROR;
      break;
    }

    const cursor = await readAndRepairSRSSyncCursor(userId);
    const timestamp = cursor.timestamp;
    const safeLastId = cursor.lastId;

    // Keyset pagination: (updated_at > ts) OR (updated_at = ts AND question_id > last_id)
    const filter = `updated_at.gt.${timestamp},and(updated_at.eq.${timestamp},question_id.gt.${safeLastId})`;

    const { data: remoteItems, error } = await client
      .from("srs")
      .select("*")
      .eq("user_id", userId)
      .or(filter)
      .order("updated_at", { ascending: true })
      .order("question_id", { ascending: true })
      .limit(BATCH_SIZE);

    if (error) {
      logger.error("Failed to pull SRS items from Supabase", { userId, error });
      incomplete = true;
      errorMessage = toErrorMessage(error);
      break;
    }

    if (!remoteItems || remoteItems.length === 0) {
      break;
    }

    const itemsToSave: SRSState[] = [];
    let lastRecordUpdatedAt = cursor.timestamp;
    let lastRecordId = cursor.lastId;
    let validRecordsInBatch = 0;

    for (const r of remoteItems) {
      const validation = RemoteSRSSchema.safeParse(r);

      if (!validation.success) {
        logger.warn("Skipping invalid remote SRS record", {
          id: r.question_id,
          error: validation.error,
        });
        continue;
      }

      const remote = validation.data;

      // Determine if we should update local
      const local = await db.srs.get([remote.question_id, userId]);

      let shouldUpdate = false;
      if (!local) {
        shouldUpdate = true;
      } else {
        // Last-Write-Wins based on last_reviewed
        // If remote is newer (higher last_reviewed), it wins.
        if (remote.last_reviewed > local.last_reviewed) {
          shouldUpdate = true;
        } else if (remote.last_reviewed === local.last_reviewed) {
          if (local.synced === 0) {
            logger.debug("SRS sync tie at last_reviewed; keeping local unsynced record", {
              userId,
              questionId: remote.question_id,
              localSynced: local.synced,
            });
          } else {
            shouldUpdate = true;
            logger.debug("SRS sync tie at last_reviewed; accepting remote because local is synced", {
              userId,
              questionId: remote.question_id,
              localSynced: local.synced,
            });
          }
        }
      }

      if (shouldUpdate) {
        itemsToSave.push({
          question_id: remote.question_id,
          user_id: userId,
          box: remote.box as 1 | 2 | 3 | 4 | 5,
          last_reviewed: remote.last_reviewed,
          next_review: remote.next_review,
          consecutive_correct: remote.consecutive_correct,
          synced: 1,
          updated_at: new Date(remote.updated_at).getTime(),
        });
      }

      lastRecordUpdatedAt = toSafeCursorTimestamp(remote.updated_at, cursor.timestamp, {
        userId,
        itemId: remote.question_id,
        path: "srs-sync-valid",
      });
      lastRecordId = remote.question_id;
      validRecordsInBatch++;
    }

    // Force advance cursor if all invalid (schema drift prevention)
    if (remoteItems.length > 0 && validRecordsInBatch === 0) {
      const lastItem = remoteItems[remoteItems.length - 1];
      if (!lastItem) {
        // Should logically never happen if length > 0, but satisfies TS
        logger.error("Unexpected: remoteItems has length but lastItem is undefined", {
          userId,
          remoteItemsLength: remoteItems.length,
        });
        break;
      }
      logger.error(
        "Batch of SRS records all failed validation. Force-advancing cursor.",
        { lastId: lastItem.question_id }
      );
      lastRecordUpdatedAt = toSafeCursorTimestamp(
        lastItem.updated_at,
        cursor.timestamp,
        {
          userId,
          itemId: lastItem.question_id,
          path: "srs-sync-all-invalid",
        }
      );
      lastRecordId = lastItem.question_id;

      consecutiveInvalidBatches++;
      if (consecutiveInvalidBatches >= MAX_INVALID_BATCHES) {
        logger.error(`Hit MAX_INVALID_BATCHES (${MAX_INVALID_BATCHES}) in SRS sync. Blocking sync to prevent loop.`, { userId });
        const hardFailureError =
          "SRS sync blocked due to repeated invalid records in pull";
        errorMessage = hardFailureError;
        await setSyncBlockState(userId, "srs", "schema_drift");
        hardFailure = true;
        incomplete = true;
        break;
      }
    } else {
      consecutiveInvalidBatches = 0;
    }

    if (itemsToSave.length > 0) {
      await db.srs.bulkPut(itemsToSave);
      stats.pulled += itemsToSave.length;
    }

    await setSRSSyncCursor(lastRecordUpdatedAt, userId, lastRecordId);

    if (remoteItems.length < BATCH_SIZE) {
      hasMore = false;
    }
  }

  return { incomplete, hardFailure, error: errorMessage };
}
