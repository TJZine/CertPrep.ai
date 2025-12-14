-- Add updated_at to results table for sync cursor pagination
ALTER TABLE results 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- Backfill updated_at with created_at for existing records to preserve order
-- (We assume existing records haven't been updated since creation if we weren't tracking it)
UPDATE results SET updated_at = created_at;

-- Create index for keyset pagination using updated_at
CREATE INDEX IF NOT EXISTS idx_results_sync_updated_at 
ON results (user_id, updated_at, id);

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS results_set_updated_at ON results;
CREATE TRIGGER results_set_updated_at
  BEFORE UPDATE ON results
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
