-- Migration: SRS LWW Batch Upsert (TEXT version)
-- Purpose: Server-side Last-Write-Wins conflict resolution for SRS sync
-- Fixed: Uses TEXT for question_id to match app's string-based IDs

-- Step 1: Alter column type from uuid to text (if needed)
-- NOTE: Run these only if the column is currently uuid:
-- ALTER TABLE srs DROP CONSTRAINT IF EXISTS srs_pkey;
-- ALTER TABLE srs ALTER COLUMN question_id TYPE TEXT;
-- ALTER TABLE srs ADD PRIMARY KEY (question_id, user_id);

-- Step 2: Create batch upsert function with LWW logic
DROP FUNCTION IF EXISTS upsert_srs_lww_batch(JSONB);

CREATE OR REPLACE FUNCTION upsert_srs_lww_batch(items JSONB)
RETURNS TABLE(out_question_id TEXT, out_updated boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH input_rows AS (
    SELECT 
      (item->>'question_id')::TEXT AS question_id,
      auth.uid() AS user_id,
      (item->>'box')::smallint AS box,
      (item->>'last_reviewed')::bigint AS last_reviewed,
      (item->>'next_review')::bigint AS next_review,
      (item->>'consecutive_correct')::integer AS consecutive_correct
    FROM jsonb_array_elements(items) AS item
  ),
  upserted AS (
    INSERT INTO srs AS s (question_id, user_id, box, last_reviewed, next_review, consecutive_correct)
    SELECT ir.question_id, ir.user_id, ir.box, ir.last_reviewed, ir.next_review, ir.consecutive_correct 
    FROM input_rows ir
    ON CONFLICT (question_id, user_id) DO UPDATE SET
      box = EXCLUDED.box,
      last_reviewed = EXCLUDED.last_reviewed,
      next_review = EXCLUDED.next_review,
      consecutive_correct = EXCLUDED.consecutive_correct
    WHERE s.last_reviewed < EXCLUDED.last_reviewed
    RETURNING s.question_id AS upserted_question_id, TRUE AS was_updated
  )
  SELECT ir.question_id, COALESCE(u.was_updated, FALSE)
  FROM input_rows ir
  LEFT JOIN upserted u ON ir.question_id = u.upserted_question_id;
END;
$$;

-- Step 3: Grant permissions
REVOKE ALL ON FUNCTION public.upsert_srs_lww_batch(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_srs_lww_batch(JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.upsert_srs_lww_batch(JSONB) TO authenticated;

-- Documentation
COMMENT ON FUNCTION upsert_srs_lww_batch IS 
  'Batch upsert SRS records with Last-Write-Wins conflict resolution based on last_reviewed timestamp. Accepts JSONB array for PostgREST compatibility. Uses TEXT for question_id.';
