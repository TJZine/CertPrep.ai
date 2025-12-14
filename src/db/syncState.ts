import { db } from "@/db";
import { NIL_UUID } from "@/lib/constants";
import { logger } from "@/lib/logger";

export interface SyncCursor {
  timestamp: string;
  lastId: string;
}

// Constants for cursor healing
const EPOCH_TIMESTAMP = "1970-01-01T00:00:00.000Z";
const ONE_HOUR_MS = 60 * 60 * 1000;

interface HealResult {
  timestamp: string;
  healed: boolean;
}

/**
 * Detects if a timestamp is corrupted (set to the future) and heals it.
 * This can happen if a device clock was temporarily set to the future during a sync.
 *
 * @param timestamp - The stored timestamp to validate
 * @param context - Logging context (userId, table)
 * @returns Object with healed timestamp and flag indicating if healing occurred
 */
function healFutureCursor(
  timestamp: string,
  context: { userId: string; table: string },
): HealResult {
  const storedTime = Date.parse(timestamp);
  if (Number.isNaN(storedTime)) {
    return { timestamp, healed: false }; // Let the caller handle invalid formats
  }

  const now = Date.now();
  if (storedTime > now + ONE_HOUR_MS) {
    logger.warn("Detected future sync cursor, resetting to epoch", {
      ...context,
      storedTimestamp: timestamp,
      currentTime: new Date(now).toISOString(),
      skewMs: storedTime - now,
    });
    return { timestamp: EPOCH_TIMESTAMP, healed: true };
  }

  return { timestamp, healed: false };
}

export async function getSyncCursor(userId: string): Promise<SyncCursor> {
  if (!userId) return { timestamp: EPOCH_TIMESTAMP, lastId: NIL_UUID };

  const key = `results:${userId}`;
  // Fallback to legacy key if present
  const state =
    (await db.syncState.get(key)) ?? (await db.syncState.get("results"));

  let timestamp = EPOCH_TIMESTAMP;
  let healed = false;
  if (state?.lastSyncedAt) {
    const rawTimestamp =
      typeof state.lastSyncedAt === "string"
        ? state.lastSyncedAt
        : new Date(state.lastSyncedAt).toISOString();

    // Heal future-corrupted cursors
    const healResult = healFutureCursor(rawTimestamp, { userId, table: "results" });
    timestamp = healResult.timestamp;
    healed = healResult.healed;
  }

  return {
    timestamp,
    // Clear lastId when healing to avoid keyset pagination skipping records
    lastId: healed ? NIL_UUID : (state?.lastId || NIL_UUID),
  };
}

export async function setSyncCursor(
  timestamp: string,
  userId: string,
  lastId?: string,
): Promise<void> {
  if (Number.isNaN(Date.parse(timestamp))) throw new Error("Invalid timestamp");

  // Defense-in-depth: Don't persist future timestamps
  const { timestamp: safeTimestamp } = healFutureCursor(timestamp, {
    userId,
    table: "results-write",
  });

  const key = `results:${userId}`;
  // Store the timestamp as a string to preserve microsecond precision from Postgres
  await db.syncState.put({
    table: key,
    lastSyncedAt: safeTimestamp,
    synced: 1,
    lastId: lastId || NIL_UUID,
  });
}

export async function getQuizSyncCursor(userId: string): Promise<SyncCursor> {
  if (!userId) return { timestamp: EPOCH_TIMESTAMP, lastId: NIL_UUID };

  const key = `quizzes:${userId}`;
  const state = await db.syncState.get(key);

  let timestamp = EPOCH_TIMESTAMP;
  let healed = false;
  if (state?.lastSyncedAt) {
    const rawTimestamp =
      typeof state.lastSyncedAt === "string"
        ? state.lastSyncedAt
        : new Date(state.lastSyncedAt).toISOString();

    // Heal future-corrupted cursors
    const healResult = healFutureCursor(rawTimestamp, { userId, table: "quizzes" });
    timestamp = healResult.timestamp;
    healed = healResult.healed;
  }

  return {
    timestamp,
    // Clear lastId when healing to avoid keyset pagination skipping records
    lastId: healed ? NIL_UUID : (state?.lastId || NIL_UUID),
  };
}

export async function setQuizSyncCursor(
  timestamp: string,
  userId: string,
  lastId?: string,
): Promise<void> {
  if (Number.isNaN(Date.parse(timestamp))) throw new Error("Invalid timestamp");

  // Defense-in-depth: Don't persist future timestamps
  const { timestamp: safeTimestamp } = healFutureCursor(timestamp, {
    userId,
    table: "quizzes-write",
  });

  const key = `quizzes:${userId}`;
  await db.syncState.put({
    table: key,
    lastSyncedAt: safeTimestamp,
    synced: 1,
    lastId: lastId || NIL_UUID,
  });
}

export async function getSRSSyncCursor(userId: string): Promise<SyncCursor> {
  if (!userId) return { timestamp: EPOCH_TIMESTAMP, lastId: NIL_UUID };

  const key = `srs:${userId}`;
  const state = await db.syncState.get(key);

  let timestamp = EPOCH_TIMESTAMP;
  let healed = false;
  if (state?.lastSyncedAt) {
    const rawTimestamp =
      typeof state.lastSyncedAt === "string"
        ? state.lastSyncedAt
        : new Date(state.lastSyncedAt).toISOString();

    // Heal future-corrupted cursors
    const healResult = healFutureCursor(rawTimestamp, { userId, table: "srs" });
    timestamp = healResult.timestamp;
    healed = healResult.healed;
  }

  return {
    timestamp,
    // Clear lastId when healing to avoid keyset pagination skipping records
    lastId: healed ? NIL_UUID : (state?.lastId || NIL_UUID),
  };
}

export async function setSRSSyncCursor(
  timestamp: string,
  userId: string,
  lastId?: string,
): Promise<void> {
  if (Number.isNaN(Date.parse(timestamp))) throw new Error("Invalid timestamp");

  // Defense-in-depth: Don't persist future timestamps
  const { timestamp: safeTimestamp } = healFutureCursor(timestamp, {
    userId,
    table: "srs-write",
  });

  const key = `srs:${userId}`;
  await db.syncState.put({
    table: key,
    lastSyncedAt: safeTimestamp,
    synced: 1,
    lastId: lastId || NIL_UUID,
  });
}

const QUIZ_BACKFILL_KEY = (userId: string): string =>
  `quizzes:backfill:${userId}`;

export async function getQuizBackfillState(userId: string): Promise<boolean> {
  const state = await db.syncState.get(QUIZ_BACKFILL_KEY(userId));
  return state?.synced === 1;
}

export async function setQuizBackfillDone(userId: string): Promise<void> {
  await db.syncState.put({
    table: QUIZ_BACKFILL_KEY(userId),
    lastSyncedAt: Date.now(),
    synced: 1,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sync Block State (Throttle/Lockout for Schema Drift)
// ─────────────────────────────────────────────────────────────────────────────

const SYNC_BLOCK_KEY = (userId: string, table: "results" | "quizzes" | "srs"): string =>
  `sync_blocked:${table}:${userId}`;

// Default lockout duration: 6 hours
const SYNC_BLOCK_TTL_MS = 6 * 60 * 60 * 1000;

export interface SyncBlockState {
  reason: string;
  blockedAt: number;
  ttlMs: number;
}

/**
 * Check if sync is currently blocked due to schema drift or other hard failures.
 * Returns the block state if blocked and TTL hasn't expired, null otherwise.
 */
export async function getSyncBlockState(
  userId: string,
  table: "results" | "quizzes" | "srs",
): Promise<SyncBlockState | null> {
  const keyPrefix = SYNC_BLOCK_KEY(userId, table);
  // The key stored is `${keyPrefix}:${reason}`, so we must search by prefix
  const state = await db.syncState.where("table").startsWith(keyPrefix).first();

  if (!state?.lastSyncedAt || state.synced !== 0) {
    return null;
  }

  const blockedAt =
    typeof state.lastSyncedAt === "number"
      ? state.lastSyncedAt
      : Date.parse(String(state.lastSyncedAt));

  if (Number.isNaN(blockedAt)) {
    return null;
  }

  // TTL is stored in lastId field (repurposed; not a UUID in this context)
  const ttlMs = state.lastId ? parseInt(state.lastId, 10) : SYNC_BLOCK_TTL_MS;
  const reason =
    state.table?.slice(keyPrefix.length + 1) || "schema_drift";

  // Check if TTL has expired
  if (Date.now() - blockedAt > ttlMs) {
    // Auto-clear expired block
    await clearSyncBlockState(userId, table);
    return null;
  }

  return { reason, blockedAt, ttlMs };
}

/**
 * Set sync blocked state to prevent retry-hammering after hard failures.
 */
export async function setSyncBlockState(
  userId: string,
  table: "results" | "quizzes" | "srs",
  reason: string,
  ttlMs: number = SYNC_BLOCK_TTL_MS,
): Promise<void> {
  // Clear any existing block for this user/table to ensure only one active block
  await clearSyncBlockState(userId, table);

  const key = SYNC_BLOCK_KEY(userId, table);
  await db.syncState.put({
    table: `${key}:${reason}`,
    lastSyncedAt: Date.now(),
    synced: 0, // synced: 0 indicates blocked state
    lastId: String(ttlMs),
  });
  logger.warn(`Sync blocked for ${table}`, { userId, reason, ttlMs });
}

/**
 * Clear sync blocked state (e.g., after app update or manual retry).
 */
export async function clearSyncBlockState(
  userId: string,
  table: "results" | "quizzes" | "srs",
): Promise<void> {
  const key = SYNC_BLOCK_KEY(userId, table);
  await db.syncState.where("table").startsWith(key).delete();
}
