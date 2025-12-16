import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/client";
import type { RemoteQuizInput, RemoteQuizRow } from "./quizDomain";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NIL_UUID } from "@/lib/constants";

let supabaseInstance: SupabaseClient | undefined;

function getSupabaseClient(): SupabaseClient | undefined {
  if (!supabaseInstance) {
    supabaseInstance = createClient();
  }
  return supabaseInstance;
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
  limit = 50,
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

  return { data: data ?? [], error: null };
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

  const payload = quizzes.map((quiz) => ({
    ...quiz,
    user_id: quiz.user_id ?? userId,
  }));

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
