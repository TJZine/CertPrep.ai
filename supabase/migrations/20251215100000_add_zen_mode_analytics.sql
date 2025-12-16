-- Add Zen Mode analytics columns to results table
-- Stores difficulty ratings (1-3) and time spent per question (seconds)

ALTER TABLE results
ADD COLUMN IF NOT EXISTS difficulty_ratings JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS time_per_question JSONB DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN results.difficulty_ratings IS 'Map of Question ID -> Difficulty Rating (1=Again, 2=Hard, 3=Good). Zen mode only.';
COMMENT ON COLUMN results.time_per_question IS 'Map of Question ID -> Seconds spent on question.';
