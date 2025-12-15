-- Add category and subcategory columns to quizzes table for analytics grouping.
-- These fields enable parent grouping in the Topic Heatmap (e.g., "Insurance - MA Personal Lines").

ALTER TABLE quizzes 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subcategory TEXT DEFAULT NULL;

-- Note: No index created on category initially. Add if filtering/grouping queries become slow:
-- CREATE INDEX IF NOT EXISTS idx_quizzes_category ON quizzes(category);
