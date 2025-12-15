import Dexie, { type Table } from "dexie";
import { computeQuizHash } from "@/lib/sync/quizDomain";
import type { Quiz } from "@/types/quiz";
import type { Result } from "@/types/result";
import type { SRSState } from "@/types/srs";

import type { SyncState } from "@/types/sync";

import { logger } from "@/lib/logger";
import { NIL_UUID } from "@/lib/constants";

// PRIVACY: Data is stored locally in IndexedDB via Dexie (Local-First).
// Secure cloud sync (Supabase) is used for backup and cross-device synchronization only.

/**
 * Dexie-backed database instance for CertPrep.ai.
 */
/**
 * Cached answer hash for avoiding redundant crypto operations.
 */
export interface HashCacheEntry {
  /** The raw answer text (primary key). */
  answer: string;
  /** The SHA-256 hash of the answer. */
  hash: string;
}

export class CertPrepDatabase extends Dexie {
  public quizzes!: Table<Quiz, string>;

  public results!: Table<Result, string>;

  public syncState!: Table<SyncState, string>;

  public srs!: Table<SRSState, [string, string]>;

  /** Cache of answer → hash mappings to avoid redundant crypto operations. */
  public hashCache!: Table<HashCacheEntry, string>;

  constructor() {
    super("CertPrepDatabase");

    // Define schema version and indexes.
    // Version 5: Add user_id and composite indexes for per-user isolation; scope sync cursor per user.
    this.version(5)
      .stores({
        quizzes: "id, title, category, created_at, *tags",
        results:
          "id, quiz_id, timestamp, synced, user_id, [user_id+synced], [user_id+quiz_id], [user_id+timestamp]",
        syncState: "table, lastSyncedAt, synced, lastId",
      })
      .upgrade(async (tx) => {
        // Backfill legacy results without user_id to a nil UUID and force re-sync prevention.
        const resultsTable = tx.table("results");
        await resultsTable
          .toCollection()
          .modify((result: Record<string, unknown>) => {
            if (!("user_id" in result) || !result.user_id) {
              result.user_id = NIL_UUID;
              result.synced = 0;
            }
          });
      });

    // Version 6: Add quiz soft-delete fields, sync metadata, and hash for dedupe.
    this.version(6)
      .stores({
        quizzes:
          "id, title, created_at, deleted_at, *tags, quiz_hash, updated_at",
        results:
          "id, quiz_id, timestamp, synced, user_id, [user_id+synced], [user_id+quiz_id], [user_id+timestamp]",
        syncState: "table, lastSyncedAt, synced, lastId",
      })
      .upgrade(async (tx) => {
        const quizzesTable = tx.table<Quiz, string>("quizzes");
        const count = await quizzesTable.count();
        const BATCH_SIZE = 20;

        for (let offset = 0; offset < count; offset += BATCH_SIZE) {
          const batch = await quizzesTable
            .offset(offset)
            .limit(BATCH_SIZE)
            .toArray();
          const updatedQuizzes: Quiz[] = [];

          await Promise.all(
            batch.map(async (quiz) => {
              let quizHash = quiz.quiz_hash;
              if (!quizHash) {
                try {
                  quizHash = await computeQuizHash({
                    title: quiz.title,
                    description: quiz.description,
                    tags: quiz.tags,
                    questions: quiz.questions,
                  });
                } catch (error) {
                  logger.warn(
                    `[DB Upgrade v6] Failed to compute hash for quiz ${quiz.id}, using fallback.`,
                    error,
                  );
                  // Fallback to existing ID or a random UUID to prevent migration failure
                  quizHash = quiz.id || crypto.randomUUID();
                }
              }

              updatedQuizzes.push({
                ...quiz,
                user_id: quiz.user_id ?? NIL_UUID,
                deleted_at: quiz.deleted_at ?? null,
                quiz_hash: quizHash,
                version: quiz.version || 1,
                updated_at: quiz.updated_at ?? quiz.created_at,
                last_synced_at: quiz.last_synced_at ?? null,
                last_synced_version: quiz.last_synced_version ?? null,
              });
            }),
          );

          if (updatedQuizzes.length > 0) {
            await quizzesTable.bulkPut(updatedQuizzes);
          }
        }
      });

    // Version 7: Add per-user scoping to quizzes and backfill legacy quizzes to NIL_UUID to prevent cross-account sync.
    this.version(7)
      .stores({
        quizzes:
          "id, user_id, created_at, deleted_at, *tags, quiz_hash, updated_at, [user_id+created_at]",
        results:
          "id, quiz_id, timestamp, synced, user_id, [user_id+synced], [user_id+quiz_id], [user_id+timestamp]",
        syncState: "table, lastSyncedAt, synced, lastId",
      })
      .upgrade(async (tx) => {
        const quizzesTable = tx.table<Quiz, string>("quizzes");
        await quizzesTable.toCollection().modify((quiz: Quiz) => {
          if (!quiz.user_id) {
            quiz.user_id = NIL_UUID;
            // Leave last_synced_version as-is; filtering in sync will prevent unclaimed quizzes from uploading.
          }
        });
      });

    // Version 8: Add deleted_at to results for soft-delete sync support
    this.version(8).stores({
      results:
        "id, quiz_id, timestamp, synced, user_id, deleted_at, [user_id+synced], [user_id+quiz_id], [user_id+timestamp]",
    });

    // Version 9: Add srs table for spaced repetition tracking (local-only)
    this.version(9).stores({
      srs: "&[question_id+user_id], user_id, next_review",
    });

    // Version 10: Add compound index for SRS sync
    this.version(10).stores({
      srs: "&[question_id+user_id], user_id, next_review, [user_id+synced]",
    });

    // Version 11: Add compound index for SRS due queries
    this.version(11).stores({
      srs: "&[question_id+user_id], user_id, next_review, [user_id+synced], [user_id+next_review]",
    });

    // Version 12: Add hashCache table for persisting answer→hash mappings
    this.version(12).stores({
      hashCache: "&answer",
    });

    this.quizzes = this.table("quizzes");
    this.results = this.table("results");
    this.syncState = this.table("syncState");
    this.hashCache = this.table("hashCache");
    this.srs = this.table("srs");
  }
}

export const db = new CertPrepDatabase();

/**
 * Expose db on window for E2E testing.
 * 
 * SECURITY: Both conditions must be true:
 * 1. NODE_ENV !== 'production' (prevents any prod build exposure)
 * 2. NEXT_PUBLIC_IS_E2E === 'true' (explicit opt-in for E2E builds)
 * 
 * This ensures that even if NEXT_PUBLIC_IS_E2E is accidentally set in a prod
 * environment, the db is NOT exposed because NODE_ENV will be 'production'.
 */
if (
  typeof window !== "undefined" &&
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_IS_E2E === "true"
) {
  (window as Window & { __certprepDb?: CertPrepDatabase }).__certprepDb = db;
}

/**
 * Opens the IndexedDB connection. Throws with contextual information on failure.
 */
export async function initializeDatabase(): Promise<void> {
  try {
    if (!db.isOpen()) {
      await db.open();
      logger.info("[CertPrep.ai] Database initialized");
    }
  } catch (error) {
    logger.error("[CertPrep.ai] Failed to initialize database", error);
    throw new Error("Unable to initialize CertPrep.ai database.");
  }
}

/**
 * Clears all quizzes, results, and sync state. Intended for testing/reset flows.
 */
export async function clearDatabase(): Promise<void> {
  try {
    await db.transaction(
      "rw",
      db.quizzes,
      db.results,
      db.syncState,
      db.srs,
      async () => {
        await Promise.all([
          db.quizzes.clear(),
          db.results.clear(),
          db.syncState.clear(),
          db.srs.clear(),
        ]);
      },
    );
  } catch (error) {
    logger.error("[CertPrep.ai] Failed to clear database", error);
    throw new Error("Unable to clear CertPrep.ai database.");
  }
}

export * from "./quizzes";
export * from "./results";
