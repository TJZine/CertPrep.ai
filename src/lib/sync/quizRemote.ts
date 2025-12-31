import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/client";
import type { RemoteQuizInput, RemoteQuizRow } from "./quizDomain";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Question } from "@/types/quiz";
import { NIL_UUID } from "@/lib/constants";

let supabaseInstance: SupabaseClient<Database> | undefined;

function getSupabaseClient(): SupabaseClient<Database> | undefined {
  if (!supabaseInstance) {
    supabaseInstance = createClient();
  }
  return supabaseInstance;
}

/** Default fetch limit for quiz sync pagination. Exported for test usage. */
export const DEFAULT_FETCH_LIMIT = 50;

/**
 * Adapter: Convert Supabase Row type to RemoteQuizRow.
 * Handles type differences between DB Json and app Question[].
 */
function toRemoteQuizRow(
  row: Database["public"]["Tables"]["quizzes"]["Row"],
): RemoteQuizRow {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    description: row.description,
    tags: row.tags ?? [],
    version: row.version,
    questions: row.questions as unknown as Question[], // DB stores as Json, app expects Question[]
    quiz_hash: row.quiz_hash,
    source_id: row.source_id,
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? new Date().toISOString(),
    deleted_at: row.deleted_at,
    category: row.category,
    subcategory: row.subcategory,
  };
}

/**
 * Adapter: Convert RemoteQuizInput to Supabase Insert type.
 * Ensures proper null handling and type coercion for DB insertion.
 */
function toQuizInsert(
  quiz: RemoteQuizInput,
  userId: string,
): Database["public"]["Tables"]["quizzes"]["Insert"] {
  return {
    id: quiz.id,
    user_id: quiz.user_id ?? userId,
    title: quiz.title,
    description: quiz.description ?? null,
    tags: quiz.tags ?? [],
    version: quiz.version,
    questions: quiz.questions as unknown as Database["public"]["Tables"]["quizzes"]["Insert"]["questions"],
    quiz_hash: quiz.quiz_hash ?? null,
    source_id: quiz.source_id ?? null,
    created_at: quiz.created_at ?? null,
    updated_at: quiz.updated_at ?? null,
    deleted_at: quiz.deleted_at ?? null,
    category: quiz.category ?? null,
    subcategory: quiz.subcategory ?? null,
  };
}

interface FetchUserQuizzesParams {
  userId: string;
  updatedAfter?: string;
  lastId?: string;
  limit?: number;
}

export async function fetchUserQuizzes({
  userId,
  updatedAfter,
  lastId,
  limit = DEFAULT_FETCH_LIMIT,
}: FetchUserQuizzesParams): Promise<{
  data: RemoteQuizRow[];
  error: unknown | null;
}> {
  const client = getSupabaseClient();

  if (!client) {
    return { data: [], error: { message: "Supabase client unavailable" } };
  }

  let query = client
    .from("quizzes")
    .select(
      "id, user_id, title, description, tags, version, questions, quiz_hash, source_id, created_at, updated_at, deleted_at, category, subcategory",
    )
    .in("user_id", [userId, NIL_UUID])
    .order("updated_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit);

  if (updatedAfter) {
    const parsed = Date.parse(updatedAfter);
    if (Number.isNaN(parsed)) {
      logger.error(
        "Invalid updatedAfter timestamp in fetchUserQuizzes; falling back to epoch",
        {
          updatedAfter,
          userId,
        },
      );
      updatedAfter = "1970-01-01T00:00:00.000Z";
      lastId = NIL_UUID;
    } else {
      updatedAfter = new Date(parsed).toISOString();
    }

    const cursorLastId = lastId ?? NIL_UUID;
    const filter = `updated_at.gt.${updatedAfter},and(updated_at.eq.${updatedAfter},id.gt.${cursorLastId})`;
    query = query.or(filter);
  }

  const { data, error } = await query;

  if (error) {
    logger.error("Failed to fetch quizzes from Supabase", { error, userId });
    return { data: [], error };
  }

  return { data: (data ?? []).map(toRemoteQuizRow), error: null };
}

export async function upsertQuizzes(
  userId: string,
  quizzes: RemoteQuizInput[],
): Promise<{ error: unknown }> {
  if (quizzes.length === 0) {
    return { error: null };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { error: { message: "Supabase client unavailable" } };
  }

  const payload = quizzes.map((quiz) => toQuizInsert(quiz, userId));

  const { error } = await client
    .from("quizzes")
    .upsert(payload, { onConflict: "id" });

  if (error) {
    logger.error("Failed to upsert quizzes to Supabase", {
      error,
      userId,
      count: quizzes.length,
    });
  }

  return { error };
}

export async function softDeleteQuizzes(
  userId: string,
  ids: string[],
): Promise<{ error: unknown }> {
  if (ids.length === 0) {
    return { error: null };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { error: { message: "Supabase client unavailable" } };
  }

  const { error } = await client
    .from("quizzes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("user_id", userId)
    .in("id", ids);

  if (error) {
    logger.error("Failed to soft delete quizzes on Supabase", {
      error,
      userId,
      ids,
    });
  }

  return { error };
}
