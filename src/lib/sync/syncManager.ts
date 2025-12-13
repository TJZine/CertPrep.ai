"use client";

import { db } from "@/db";
import { logger } from "@/lib/logger";
import { getSyncCursor, setSyncCursor } from "@/db/syncState";
import { createClient } from "@/lib/supabase/client";
import { logNetworkAwareSlowSync } from "@/lib/sync/syncLogging";
import { QUIZ_MODES, type QuizMode } from "@/types/quiz";
import type { Result } from "@/types/result";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

let supabaseInstance: SupabaseClient | undefined;

function getSupabaseClient(): SupabaseClient | undefined {
  if (!supabaseInstance) {
    supabaseInstance = createClient();
  }
  return supabaseInstance;
}
const BATCH_SIZE = 50;
const TIME_BUDGET_MS = 5000;

// Schema for validating remote result data structure
// Using .passthrough() to preserve unknown fields from newer schema versions
const RemoteResultSchema = z.object({
  id: z.string(),
  quiz_id: z.string(),
  timestamp: z.coerce.number(), // Coerce string (from Postgres bigint) to number
  mode: z.enum(QUIZ_MODES).transform((val) => val as QuizMode),
  score: z.number().min(0).max(100),
  time_taken_seconds: z.number().min(0),
  answers: z.record(z.string(), z.string()),
  flagged_questions: z.array(z.string()),
  category_breakdown: z.record(z.string(), z.number()),
  question_ids: z.array(z.string()).optional().nullable(),
  created_at: z.string(),
  deleted_at: z.string().nullable().optional(), // For cross-device deletion sync
}).passthrough();

const syncState = {
  isSyncing: false,
  lastSyncAttempt: 0,
};

export type SyncResultsOutcome = {
  incomplete: boolean;
  error?: string;
  status?: "synced" | "skipped" | "failed";
  shouldRetry?: boolean;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  // Handle Supabase PostgrestError objects (properties may not serialize with JSON.stringify)
  if (typeof error === "object" && error !== null) {
    const e = error as Record<string, unknown>;
    // PostgrestError has: code, message, details, hint
    if (e.message || e.code) {
      const parts: string[] = [];
      if (e.code) parts.push(`[${e.code}]`);
      if (e.message) parts.push(String(e.message));
      if (e.details) parts.push(`Details: ${e.details}`);
      if (e.hint) parts.push(`Hint: ${e.hint}`);
      if (parts.length > 0) return parts.join(" ");
    }
  }

  try {
    const serialized = JSON.stringify(error);
    // If JSON.stringify returns "{}", the object has no enumerable properties
    if (serialized === "{}") return "Unknown error (empty error object)";
    return serialized;
  } catch {
    return "Unknown error";
  }
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
    logger.warn("Invalid cursor timestamp encountered, using fallback", {
      ...context,
      fallback,
    });
    return new Date(fallback).toISOString();
  }

  logger.error("Invalid cursor timestamp and fallback; defaulting to epoch", {
    ...context,
  });
  return "1970-01-01T00:00:00.000Z";
}

export async function syncResults(userId: string): Promise<SyncResultsOutcome> {
  if (!userId) return { incomplete: false };

  // Optimization: Don't attempt sync if browser is offline
  if (typeof navigator !== "undefined") {
    logger.debug(`[Sync] Checking online status: ${navigator.onLine}`);
    if (!navigator.onLine) {
      logger.debug("Browser is offline, skipping sync");
      return { incomplete: true, error: "Offline" };
    }
  }

  // Use Web Locks API for cross-tab synchronization safety
  // This prevents multiple tabs from running sync simultaneously
  if (typeof navigator !== "undefined" && "locks" in navigator) {
    try {
      return (
        (await navigator.locks.request(
          `sync-results-${userId}`,
          { ifAvailable: true },
          async (lock) => {
            if (!lock) {
              logger.debug("Sync already in progress in another tab, skipping");
              return { incomplete: false, status: "skipped" };
            }
            return await performSync(userId);
          },
        )) || { incomplete: false }
      );
    } catch (error) {
      logger.error("Failed to acquire sync lock:", error);
      return { incomplete: false };
    }
  } else {
    // Fallback for environments without Web Locks (e.g. some tests or very old browsers)
    if (syncState.isSyncing) {
      if (Date.now() - syncState.lastSyncAttempt > 15000) {
        logger.warn("Sync lock timed out, resetting...");
        syncState.isSyncing = false;
      } else {
        return { incomplete: false };
      }
    }
    syncState.isSyncing = true;
    syncState.lastSyncAttempt = Date.now();
    try {
      return await performSync(userId);
    } finally {
      syncState.isSyncing = false;
    }
  }
}

async function performSync(userId: string): Promise<SyncResultsOutcome> {
  performance.mark("syncResults-start");
  let incomplete = false;
  const startTime = Date.now();
  let pushed = 0;
  let pulled = 0;
  let lastError: string | undefined;

  const client = getSupabaseClient();
  if (!client) {
    return { incomplete: true, error: "Supabase client unavailable" };
  }

  // Validate auth session matches the userId we're syncing for
  // Use getSession() instead of getUser() - it reads from local storage without a network call
  const { data: { session }, error: authError } = await client.auth.getSession();
  if (authError || !session?.user) {
    logger.warn("Sync skipped: No valid auth session", { authError: authError?.message });
    return { incomplete: true, error: "Not authenticated", status: "skipped" };
  }
  if (session.user.id !== userId) {
    logger.error("Sync aborted: Auth user ID mismatch", { authUserId: session.user.id, syncUserId: userId });
    return { incomplete: true, error: "User ID mismatch - please re-login", status: "failed" };
  }

  try {
    // 1. PUSH: Upload unsynced local results to Supabase
    const unsyncedResults = await db.results
      .where("[user_id+synced]")
      .equals([userId, 0])
      .toArray();

    logger.debug("[Sync] Found unsynced results:", { count: unsyncedResults.length, userId });

    if (unsyncedResults.length > 0) {
      // Chunk the upload to avoid hitting payload limits
      for (let i = 0; i < unsyncedResults.length; i += BATCH_SIZE) {
        // Check time budget
        if (Date.now() - startTime > TIME_BUDGET_MS) {
          logger.warn(
            `Sync time budget exceeded (${TIME_BUDGET_MS}ms) during PUSH, pausing.`,
          );
          incomplete = true;
          break;
        }

        const batch = unsyncedResults.slice(i, i + BATCH_SIZE);
        const toDelete = batch.filter((r) => r.deleted_at);
        const toUpsert = batch.filter((r) => !r.deleted_at);

        // Handle Deletions - use soft-delete for cross-device sync
        if (toDelete.length > 0) {
          const deleteIds = toDelete.map((r) => r.id);
          const { error: deleteError } = await client
            .from("results")
            .update({ deleted_at: new Date().toISOString() })
            .in("id", deleteIds);

          if (deleteError) {
            logger.error("Failed to sync deletions to Supabase:", deleteError);
            incomplete = true;
            lastError = toErrorMessage(deleteError);
            // Check for critical errors (same as upsert)
            const code = deleteError.code;
            const status = (deleteError as unknown as { status?: number })
              .status;
            if (
              code === "PGRST301" ||
              code === "429" ||
              code === "401" ||
              status === 429 ||
              status === 401 ||
              status === 500 ||
              status === 503
            ) {
              break;
            }
          } else {
            // Mark local tombstones as synced (keep for local display filtering)
            await db.results.bulkUpdate(
              toDelete.map((r) => ({ key: r.id, changes: { synced: 1 } })),
            );
            pushed += toDelete.length;
          }
        }

        // Handle Upserts
        if (toUpsert.length > 0) {
          const { error } = await client.from("results").upsert(
            toUpsert.map((r) => ({
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
            })),
            { onConflict: "id" },
          );

          if (error) {
            const errorMsg = toErrorMessage(error);
            logger.error("Failed to push results batch to Supabase:", errorMsg, { code: error.code, status: (error as unknown as { status?: number }).status });
            incomplete = true;
            lastError = errorMsg;

            // Circuit Breaker: Stop syncing if we hit critical errors
            const code = error.code;
            const status = (error as unknown as { status?: number }).status; // Supabase error object often contains status

            if (
              code === "PGRST301" || // JWT expired or RLS violation
              code === "429" || // Rate limit (if passed as code)
              code === "401" || // Unauthorized (if passed as code)
              status === 429 || // Rate limit (HTTP status)
              status === 401 || // Unauthorized (HTTP status)
              status === 500 || // Internal Server Error
              status === 503 // Service Unavailable
            ) {
              logger.error(
                `Critical sync error detected (${code || status}). Aborting push to prevent API hammering.`,
              );
              break;
            }
            // Continue to next batch instead of failing completely for non-critical errors
          } else {
            // Mark as synced locally
            const updateKeys = toUpsert.map((r) => r.id);
            logger.debug("[Sync] Marking results as synced:", { ids: updateKeys });
            await db.results.bulkUpdate(
              toUpsert.map((r) => ({ key: r.id, changes: { synced: 1 } })),
            );
            logger.debug("[Sync] Successfully updated synced status for:", { count: toUpsert.length });
            pushed += toUpsert.length;
          }
        }
      }
    }

    if (incomplete)
      return {
        incomplete,
        error: lastError,
        status: "failed",
        shouldRetry: true,
      };

    // 2. PULL: Incremental Sync with Keyset Pagination
    let hasMore = true;

    while (hasMore) {
      if (Date.now() - startTime > TIME_BUDGET_MS) {
        logger.warn(
          `Sync limit reached (time budget ${TIME_BUDGET_MS}ms), pausing until next interval`,
        );
        hasMore = false;
        incomplete = true;
        break;
      }

      const cursor = await getSyncCursor(userId);

      // Use raw timestamp string to preserve microsecond precision if present
      const timestamp = cursor.timestamp;

      // Use keyset pagination (created_at, id) to handle identical timestamps
      // Logic: (created_at > last_ts) OR (created_at = last_ts AND id > last_id)
      // We construct the filter carefully to ensure valid PostgREST syntax
      const filter = `created_at.gt.${timestamp},and(created_at.eq.${timestamp},id.gt.${cursor.lastId})`;

      const { data: remoteResults, error: fetchError } = await client
        .from("results")
        .select(
          "id, quiz_id, timestamp, mode, score, time_taken_seconds, answers, flagged_questions, category_breakdown, question_ids, created_at, deleted_at",
        )
        .eq("user_id", userId)
        .or(filter)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .limit(BATCH_SIZE);

      if (fetchError) {
        logger.error("Failed to fetch results from Supabase:", fetchError);
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
      const resultsToDelete: string[] = []; // IDs of results deleted on remote
      let lastRecordCreatedAt = cursor.timestamp;
      let lastRecordId = cursor.lastId;
      let validRecordsInBatch = 0;

      for (const r of remoteResults) {
        if (!r) continue; // Skip if undefined

        const validation = RemoteResultSchema.safeParse(r);

        if (!validation.success) {
          logger.warn(
            `Skipping invalid remote result (ID: ${r.id}):`,
            validation.error,
          );
          continue;
        }

        const validResult = validation.data;

        // Handle remote deletions - apply locally
        if (validResult.deleted_at) {
          resultsToDelete.push(validResult.id);
          // Still advance cursor for deleted records
          lastRecordCreatedAt = toSafeCursorTimestamp(r.created_at, cursor.timestamp, {
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
          synced: 1,
        });

        // Only advance cursor for valid records to ensure we don't skip data
        // if a subsequent record in this batch is valid.
        lastRecordCreatedAt = toSafeCursorTimestamp(r.created_at, cursor.timestamp, {
          userId,
          resultId: r.id,
          path: "results-sync-valid",
        });
        lastRecordId = r.id;
        validRecordsInBatch++;
      }

      // GUARD: If we fetched records but ALL failed validation, we must force-advance
      // the cursor to the last item in the batch to prevent an infinite loop.
      // This means we are explicitly accepting the loss of these invalid records.
      if (remoteResults.length > 0 && validRecordsInBatch === 0) {
        const lastItem = remoteResults[remoteResults.length - 1];
        // We checked length > 0, so lastItem exists.
        if (lastItem) {
          logger.error(
            `Batch of ${remoteResults.length} records all failed validation. Force-advancing cursor to prevent infinite loop.`,
            { lastId: lastItem.id, lastCreatedAt: lastItem.created_at },
          );
          lastRecordCreatedAt = toSafeCursorTimestamp(
            lastItem.created_at,
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
        // bulkPut handles upserts (idempotent)
        await db.results.bulkPut(resultsToSave);
        pulled += resultsToSave.length;
      }

      // Apply remote deletions locally
      if (resultsToDelete.length > 0) {
        await db.results.bulkDelete(resultsToDelete);
        logger.debug("Applied remote deletions locally", { count: resultsToDelete.length, userId });
      }

      // Update cursor to the last seen record's timestamp AND id
      const safeCursorTimestamp = toSafeCursorTimestamp(
        lastRecordCreatedAt,
        cursor.timestamp,
        { userId, resultId: lastRecordId, path: "results-sync-final" },
      );
      await setSyncCursor(safeCursorTimestamp, userId, lastRecordId);

      if (remoteResults.length < BATCH_SIZE) {
        hasMore = false;
      }
    }
  } catch (error) {
    logger.error("Sync failed:", error);
    incomplete = true;
    lastError = toErrorMessage(error);
  } finally {
    performance.mark("syncResults-end");
    performance.measure("syncResults", "syncResults-start", "syncResults-end");
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
  return {
    incomplete,
    error: lastError,
    status: incomplete ? "failed" : "synced",
    shouldRetry: incomplete, // If incomplete, we generally want to retry unless it was a hard error handled elsewhere
  };
}
