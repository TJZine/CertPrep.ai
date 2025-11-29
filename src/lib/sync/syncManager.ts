'use client';

import { db } from '@/db';
import { logger } from '@/lib/logger';
import { getSyncCursor, setSyncCursor } from '@/db/syncState';
import { createClient } from '@/lib/supabase/client';
import { QUIZ_MODES, type QuizMode } from '@/types/quiz';
import type { Result } from '@/types/result';
import { z } from 'zod';

const supabase = createClient();
const BATCH_SIZE = 50;

// Simple in-memory lock to prevent race conditions if sync is triggered multiple times rapidly
let isSyncing = false;

// Schema for validating remote result data structure
const RemoteResultSchema = z.object({
  id: z.string(),
  quiz_id: z.string(),
  timestamp: z.coerce.number(), // Coerce string (from Postgres bigint) to number
  mode: z.enum([...QUIZ_MODES] as [string, ...string[]]).transform((val) => val as QuizMode),
  score: z.number().min(0).max(100),
  time_taken_seconds: z.number().min(0),
  answers: z.record(z.string(), z.string()),
  flagged_questions: z.array(z.string()),
  category_breakdown: z.record(z.string(), z.number()),
  created_at: z.string(),
});

export async function syncResults(userId: string): Promise<void> {
  if (!userId) return;
  if (isSyncing) {
    return;
  }

  isSyncing = true;

  try {
    // 1. PUSH: Upload unsynced local results to Supabase
    const unsyncedResults = await db.results.where('synced').equals(0).toArray();

    if (unsyncedResults.length > 0) {
      // Chunk the upload to avoid hitting payload limits
      for (let i = 0; i < unsyncedResults.length; i += BATCH_SIZE) {
        const batch = unsyncedResults.slice(i, i + BATCH_SIZE);
        
        const { error } = await supabase.from('results').upsert(
          batch.map((r) => ({
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
          }))
        );

        if (error) {
          logger.error('Failed to push results batch to Supabase:', error);
          // Continue to next batch instead of failing completely
        } else {
          // Mark as synced locally
          await db.results.bulkUpdate(
            batch.map((r) => ({ key: r.id, changes: { synced: 1 } }))
          );
        }
      }
    }

    // 2. PULL: Incremental Sync with Keyset Pagination
    let hasMore = true;

    while (hasMore) {
      const cursor = await getSyncCursor(userId);
      
      // Use keyset pagination (created_at, id) to handle identical timestamps
      // Logic: (created_at > last_ts) OR (created_at = last_ts AND id > last_id)
      const filter = `created_at.gt.${cursor.timestamp},and(created_at.eq.${cursor.timestamp},id.gt.${cursor.lastId})`;

      const { data: remoteResults, error: fetchError } = await supabase
        .from('results')
        .select(
          'id, quiz_id, timestamp, mode, score, time_taken_seconds, answers, flagged_questions, category_breakdown, created_at'
        )
        .eq('user_id', userId)
        .or(filter)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(BATCH_SIZE);

      if (fetchError) {
        logger.error('Failed to fetch results from Supabase:', fetchError);
        hasMore = false;
        break;
      }

      if (!remoteResults || remoteResults.length === 0) {
        hasMore = false;
        break;
      }

      const resultsToSave: Result[] = [];
      let lastRecordCreatedAt = cursor.timestamp;
      let lastRecordId = cursor.lastId;

      for (const r of remoteResults) {
        lastRecordCreatedAt = r.created_at;
        lastRecordId = r.id;

        const validation = RemoteResultSchema.safeParse(r);

        if (!validation.success) {
          logger.warn(`Skipping invalid remote result (ID: ${r.id}):`, validation.error);
          continue;
        }

        const validResult = validation.data;

        resultsToSave.push({
          id: validResult.id,
          quiz_id: validResult.quiz_id,
          timestamp: validResult.timestamp,
          mode: validResult.mode,
          score: validResult.score,
          time_taken_seconds: validResult.time_taken_seconds,
          answers: validResult.answers,
          flagged_questions: validResult.flagged_questions,
          category_breakdown: validResult.category_breakdown,
          synced: 1,
        });
      }

      if (resultsToSave.length > 0) {
        // bulkPut handles upserts (idempotent)
        await db.results.bulkPut(resultsToSave);
      }
      
      // Update cursor to the last seen record's timestamp AND id
      await setSyncCursor(userId, lastRecordCreatedAt, lastRecordId);

      if (remoteResults.length < BATCH_SIZE) {
        hasMore = false;
      }
    }
  } catch (error) {
    logger.error('Sync failed:', error);
  } finally {
    isSyncing = false;
  }
}