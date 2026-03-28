import { db } from "./dbInstance";
import { LEGACY_SRS_QUIZ_ID_PREFIX, getSRSQuizId } from "./srsQuiz";
import type { Quiz } from "@/types/quiz";

/**
 * Migrates legacy SRS quiz IDs (`srs-{userId}`) to the deterministic UUID v5 format.
 *
 * This is required to sync successfully when Supabase expects UUID IDs for quizzes/results.
 */
export async function migrateLegacySRSQuizIfNeeded(
  userId: string,
): Promise<void> {
  const srsQuizId = getSRSQuizId(userId);
  const legacyId = `${LEGACY_SRS_QUIZ_ID_PREFIX}${userId}`;

  const [legacyQuiz, existingNewQuiz, legacyResultCount] = await Promise.all([
    db.quizzes.get(legacyId),
    db.quizzes.get(srsQuizId),
    db.results.where("[user_id+quiz_id]").equals([userId, legacyId]).count(),
  ]);

  if (!legacyQuiz && legacyResultCount === 0) return;

  const now = Date.now();
  const migratedQuiz: Quiz =
    existingNewQuiz ??
    ({
      id: srsQuizId,
      user_id: userId,
      title: legacyQuiz?.title || "SRS Review Sessions",
      description:
        legacyQuiz?.description ||
        "Spaced repetition review sessions aggregated from your quizzes",
      questions: legacyQuiz?.questions ?? [],
      tags: Array.from(new Set([...(legacyQuiz?.tags ?? []), "srs", "system"])),
      version: legacyQuiz?.version ?? 1,
      created_at: legacyQuiz?.created_at ?? now,
      updated_at: now,
      deleted_at: null,
      quiz_hash: legacyQuiz?.quiz_hash ?? null,
      last_synced_at: null,
      last_synced_version: null,
    } satisfies Quiz);

  await db.transaction("rw", db.quizzes, db.results, async () => {
    // Ensure the UUID-based quiz exists (dirty so quizSyncManager will push it).
    await db.quizzes.put(migratedQuiz);

    // Move any legacy results onto the UUID-based quiz and re-mark as unsynced.
    if (legacyResultCount > 0) {
      await db.results
        .where("[user_id+quiz_id]")
        .equals([userId, legacyId])
        .modify({ quiz_id: srsQuizId, synced: 0 });
    }

    // Drop legacy quiz row if it exists; it cannot sync to Supabase.
    await db.quizzes.delete(legacyId);
  });
}

