"use client";

import { db } from "@/db";
import {
  getSRSSyncCursor,
  setSRSSyncCursor,
  getSyncBlockState,
  setSyncBlockState,
} from "@/db/syncState";
import { logger } from "@/lib/logger";
import { logNetworkAwareSlowSync } from "@/lib/sync/syncLogging";
import { createClient } from "@/lib/supabase/client";
import { safeMark, safeMeasure } from "@/lib/perfMarks";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SRSState } from "@/types/srs";

let supabaseInstance: SupabaseClient | undefined;

function getSupabaseClient(): SupabaseClient | undefined {
  if (!supabaseInstance) {
    supabaseInstance = createClient();
  }
  return supabaseInstance;
}

const BATCH_SIZE = 50;
const TIME_BUDGET_MS = 5000;
const MAX_INVALID_BATCHES = 3;

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

export async function syncSRS(userId: string): Promise<{ incomplete: boolean }> {
  if (!userId) return { incomplete: false };

  // Optimization: Don't attempt sync if browser is offline
  if (typeof navigator !== "undefined") {
    if (!navigator.onLine) {
      return { incomplete: true };
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
              return { incomplete: true }; // Skipped — caller should retry
            }
            try {
              return await performSRSSync(userId);
            } catch (error) {
              logger.error("SRS sync failed while holding lock", error);
              return { incomplete: true }; // Failed — caller should retry
            }
          },
        )) ?? { incomplete: true }
      );
    } catch (error) {
      logger.error("Failed to acquire SRS sync lock request", error);
      return { incomplete: true };
    }
  }

  if (syncState.isSyncing) {
    if (Date.now() - syncState.lastSyncAttempt > 30000) {
      logger.warn("SRS sync lock timed out, resetting");
      syncState.isSyncing = false;
    } else {
      return { incomplete: false };
    }
  }

  syncState.isSyncing = true;
  syncState.lastSyncAttempt = Date.now();
  try {
    return await performSRSSync(userId);
  } catch (error) {
    logger.error("SRS sync failed (fallback path)", error);
    return { incomplete: false };
  } finally {
    syncState.isSyncing = false;
  }
}

async function performSRSSync(userId: string): Promise<{ incomplete: boolean }> {
  safeMark("srsSync-start");
  const startTime = Date.now();
  let incomplete = false;
  const stats = { pushed: 0, pulled: 0 };

  const client = getSupabaseClient();
  if (!client) {
    return { incomplete: true };
  }

  // Validate auth session matches the userId we're syncing for
  const { data: { session }, error: authError } = await client.auth.getSession();
  if (authError || !session?.user) {
    logger.warn("SRS sync skipped: No valid auth session", { authError: authError?.message });
    return { incomplete: true };
  }
  if (session.user.id !== userId) {
    logger.error("SRS sync aborted: Auth user ID mismatch", { authUserId: session.user.id, syncUserId: userId });
    return { incomplete: true };
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
    return { incomplete: true };
  }

  try {
    if (Date.now() - startTime > TIME_BUDGET_MS) {
      return { incomplete: true };
    }

    incomplete =
      (await pushLocalChanges(userId, startTime, stats, client)) || incomplete;

    if (Date.now() - startTime > TIME_BUDGET_MS) {
      return { incomplete: true };
    }

    const pullResult = await pullRemoteChanges(userId, startTime, stats, client);
    incomplete = pullResult.incomplete || incomplete;

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
    return { incomplete };
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

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  // Handle Supabase PostgrestError which has message/code/details/hint properties
  if (error && typeof error === "object") {
    const e = error as Record<string, unknown>;
    if (typeof e.message === "string") {
      const parts = [e.message];
      if (e.code) parts.push(`code=${e.code}`);
      if (e.details) parts.push(`details=${e.details}`);
      if (e.hint) parts.push(`hint=${e.hint}`);
      return parts.join(" | ");
    }
  }

  try {
    const json = JSON.stringify(error);
    return json === "{}" ? "Unknown error (empty object)" : json;
  } catch {
    return "Unknown error";
  }
}

async function pushLocalChanges(
  userId: string,
  startTime: number,
  stats: { pushed: number },
  client: SupabaseClient,
): Promise<boolean> {
  let incomplete = false;

  // Find unsynced local SRS items
  // Index: [user_id+synced]
  const unsyncedItems = await db.srs
    .where("[user_id+synced]")
    .equals([userId, 0])
    .toArray();

  if (unsyncedItems.length === 0) return false;

  for (let i = 0; i < unsyncedItems.length; i += BATCH_SIZE) {
    if (Date.now() - startTime > TIME_BUDGET_MS) {
      logger.warn("SRS sync time budget exceeded during push");
      incomplete = true;
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

      // Check for critical errors (circuit breaker)
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
    const updatedCount = Array.isArray(data)
      ? data.filter((r: { out_updated?: boolean }) => r.out_updated).length
      : batch.length; // Backward compat: assume all updated if no structured response
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

  return incomplete;
}


function toSafeCursorTimestamp(
  candidate: unknown,
  fallback: string,
  context: Record<string, unknown>,
): string {
  if (typeof candidate === "string" && !Number.isNaN(Date.parse(candidate))) {
    return new Date(candidate).toISOString();
  }

  if (!Number.isNaN(Date.parse(fallback))) {
    logger.warn("Invalid cursor timestamp encountered in SRS sync, using fallback", {
      ...context,
      fallback,
    });
    return new Date(fallback).toISOString();
  }

  logger.error("Invalid cursor timestamp and fallback in SRS sync; defaulting to epoch", {
    ...context,
  });
  return "1970-01-01T00:00:00.000Z";
}

async function pullRemoteChanges(
  userId: string,
  startTime: number,
  stats: { pulled: number },
  client: SupabaseClient,
): Promise<{ incomplete: boolean; hardFailure: boolean }> {
  let incomplete = false;
  let hardFailure = false;
  let hasMore = true;
  let consecutiveInvalidBatches = 0;

  while (hasMore) {
    if (Date.now() - startTime > TIME_BUDGET_MS) {
      logger.warn("SRS sync time budget exceeded during pull");
      incomplete = true;
      break;
    }

    const cursor = await getSRSSyncCursor(userId);
    const timestamp = cursor.timestamp;

    // Validate lastId to prevent query failures from corrupted cursors
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isValidCursor = UUID_REGEX.test(cursor.lastId);
    const safeLastId = isValidCursor ? cursor.lastId : "00000000-0000-0000-0000-000000000000";

    if (!isValidCursor && cursor.lastId) {
      logger.warn("Corrupted SRS cursor detected; resetting to start", {
        userId,
        invalidLastId: cursor.lastId,
      });
    }

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

  return { incomplete, hardFailure };
}
