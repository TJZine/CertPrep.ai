import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/client';
import type { RemoteQuizInput, RemoteQuizRow } from './quizDomain';

let supabaseInstance: ReturnType<typeof createClient> | null = null;

function getSupabaseClient(): ReturnType<typeof createClient> {
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
}: FetchUserQuizzesParams): Promise<{ data: RemoteQuizRow[]; error: unknown | null }> {
  const client = getSupabaseClient();
  let query = client
    .from('quizzes')
    .select(
      'id, user_id, title, description, tags, version, questions, quiz_hash, created_at, updated_at, deleted_at',
    )
    .eq('user_id', userId)
    .order('updated_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(limit);

  if (updatedAfter) {
    const safeUpdatedAfter = new Date(updatedAfter).toISOString();
    const cursorLastId = lastId ?? NIL_UUID;
    const filter = `updated_at.gt.${safeUpdatedAfter},and(updated_at.eq.${safeUpdatedAfter},id.gt.${cursorLastId})`;
    query = query.or(filter);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Failed to fetch quizzes from Supabase', { error, userId });
    return { data: [], error };
  }

  return { data: data ?? [], error: null };
}

export async function upsertQuizzes(userId: string, quizzes: RemoteQuizInput[]): Promise<{ error: unknown }> {
  if (quizzes.length === 0) {
    return { error: null };
  }

  const payload = quizzes.map((quiz) => ({
    ...quiz,
    user_id: quiz.user_id ?? userId,
  }));

  const { error } = await getSupabaseClient()
    .from('quizzes')
    .upsert(payload, { onConflict: 'user_id,id' });

  if (error) {
    logger.error('Failed to upsert quizzes to Supabase', { error, userId, count: quizzes.length });
  }

  return { error };
}

export async function softDeleteQuizzes(userId: string, ids: string[]): Promise<{ error: unknown }> {
  if (ids.length === 0) {
    return { error: null };
  }

  const { error } = await getSupabaseClient()
    .from('quizzes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', userId)
    .in('id', ids);

  if (error) {
    logger.error('Failed to soft delete quizzes on Supabase', { error, userId, ids });
  }

  return { error };
}
const NIL_UUID = '00000000-0000-0000-0000-000000000000';
