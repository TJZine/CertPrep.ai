-- Add partial indexes on category columns for efficient analytics queries.
-- Using partial index (WHERE category IS NOT NULL) for smaller, faster index.
-- Note: CONCURRENTLY removed because Supabase migrations run in transactions.
-- For large production tables, consider running these indexes manually outside migrations.

-- Defensive guard: only create indexes if columns exist (protects against partial migration state)
DO $$ BEGIN
  -- Check and create category index
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'quizzes' 
      AND column_name = 'category'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_quizzes_category 
      ON quizzes(category) WHERE category IS NOT NULL;
  END IF;

  -- Check and create subcategory index independently
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'quizzes' 
      AND column_name = 'subcategory'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_quizzes_subcategory 
      ON quizzes(subcategory) WHERE subcategory IS NOT NULL;
  END IF;
END $$;

-- Note: These indexes optimize:
-- 1. Topic Heatmap category grouping queries
-- 2. Analytics filtering by category
-- 3. Any future category-based joins or lookups
