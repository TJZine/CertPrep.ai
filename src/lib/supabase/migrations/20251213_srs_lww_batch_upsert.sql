-- Migration: SRS LWW Batch Upsert
-- Purpose: Server-side Last-Write-Wins conflict resolution for SRS sync
-- Date: 2025-12-13

-- 1. Create composite type for batch input
DO $$ BEGIN
  CREATE TYPE srs_input AS (
    question_id uuid,
    user_id uuid,
    box smallint,
    last_reviewed bigint,
    next_review bigint,
    consecutive_correct integer
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create batch upsert function with LWW logic
CREATE OR REPLACE FUNCTION upsert_srs_lww_batch(items srs_input[])
RETURNS TABLE(question_id uuid, updated boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH input_rows AS (
    SELECT 
      (unnest.question_id)::uuid AS question_id,
      (unnest.user_id)::uuid AS user_id,
      unnest.box,
      unnest.last_reviewed,
      unnest.next_review,
      unnest.consecutive_correct
    FROM unnest(items) AS unnest
  ),
  upserted AS (
    INSERT INTO srs (question_id, user_id, box, last_reviewed, next_review, consecutive_correct)
    SELECT 
      ir.question_id, 
      ir.user_id, 
      ir.box, 
      ir.last_reviewed, 
      ir.next_review, 
      ir.consecutive_correct 
    FROM input_rows ir
    ON CONFLICT (question_id, user_id) DO UPDATE SET
      box = EXCLUDED.box,
      last_reviewed = EXCLUDED.last_reviewed,
      next_review = EXCLUDED.next_review,
      consecutive_correct = EXCLUDED.consecutive_correct
    WHERE srs.last_reviewed < EXCLUDED.last_reviewed
    RETURNING srs.question_id, TRUE AS was_updated
  )
  SELECT 
    ir.question_id,
    COALESCE(u.was_updated, FALSE) AS updated
  FROM input_rows ir
  LEFT JOIN upserted u ON ir.question_id = u.question_id;
END;
$$;

-- 3. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION upsert_srs_lww_batch(srs_input[]) TO authenticated;

-- 4. Add comment for documentation
COMMENT ON FUNCTION upsert_srs_lww_batch IS 
  'Batch upsert SRS records with Last-Write-Wins conflict resolution based on last_reviewed timestamp. Returns which records were actually updated.';
