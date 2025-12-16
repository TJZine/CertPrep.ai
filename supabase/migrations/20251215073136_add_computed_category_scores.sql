-- Add computed_category_scores column for pre-computed analytics data
-- This stores raw { correct, total } counts per category, computed at save time

ALTER TABLE results
ADD COLUMN computed_category_scores JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN results.computed_category_scores IS 'Pre-computed category scores (correct/total counts) for analytics. Computed at save time to avoid re-hashing on render.';
