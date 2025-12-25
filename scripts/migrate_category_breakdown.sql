-- Migration: Normalize category_breakdown keys
-- Date: 2025-12-25
-- Description: Maps legacy category keys to official 7 categories in category_breakdown JSONB.
-- RUN THIS IN SUPABASE SQL EDITOR

BEGIN;

-- Update category_breakdown for results with legacy category keys
-- Uses the same mapping as computed_category_scores migration
UPDATE results r
SET category_breakdown = aggregated.new_breakdown
FROM (
    SELECT 
        r2.id,
        (
            SELECT jsonb_object_agg(
                agg.new_category,
                -- For percentages, we average them when aggregating multiple legacy categories
                ROUND(agg.avg_score)
            )
            FROM (
                SELECT
                    new_category,
                    AVG(score_value) AS avg_score
                FROM (
                    SELECT
                        CASE key
                            -- Homeowners
                            WHEN 'Homeowners Section I' THEN 'Homeowners Policy'
                            WHEN 'Homeowners Section II' THEN 'Homeowners Policy'
                            -- Auto
                            WHEN 'MA Personal Auto' THEN 'Auto Insurance'
                            WHEN 'MA Auto Policy' THEN 'Auto Insurance'
                            -- Property & Casualty
                            WHEN 'Contract Law' THEN 'Property and Casualty Insurance Basics'
                            WHEN 'Property & Casualty Basics' THEN 'Property and Casualty Insurance Basics'
                            WHEN 'Property & Liability Basics' THEN 'Property and Casualty Insurance Basics'
                            WHEN 'Property and Casualty Basics' THEN 'Property and Casualty Insurance Basics'
                            -- Dwelling
                            WHEN 'Dwelling Policies' THEN 'Dwelling Policy'
                            -- Regulation
                            WHEN 'MA Insurance Law' THEN 'Insurance Regulation'
                            -- General
                            WHEN 'General Insurance Basics' THEN 'General Insurance'
                            -- Other
                            WHEN 'Flood Insurance' THEN 'Other Coverages and Options'
                            -- Keep already-standardized keys
                            ELSE key
                        END AS new_category,
                        (value)::numeric AS score_value
                    FROM jsonb_each(r2.category_breakdown)
                ) mapped
                GROUP BY new_category
            ) agg
        ) AS new_breakdown
    FROM results r2
    WHERE r2.category_breakdown IS NOT NULL
      AND r2.category_breakdown != '{}'::jsonb
      -- Only update rows that have at least one legacy key
      AND EXISTS (
          SELECT 1 FROM jsonb_object_keys(r2.category_breakdown) AS k
          WHERE k IN (
              'Contract Law', 'Dwelling Policies', 'Flood Insurance',
              'General Insurance Basics', 'Homeowners Section I', 'Homeowners Section II',
              'MA Insurance Law', 'MA Personal Auto', 'MA Auto Policy',
              'Property & Casualty Basics', 'Property & Liability Basics',
              'Property and Casualty Basics'
          )
      )
) aggregated
WHERE r.id = aggregated.id;

-- Verify the update - show distinct categories after migration
SELECT DISTINCT jsonb_object_keys(category_breakdown) AS category_name
FROM results
WHERE category_breakdown IS NOT NULL
ORDER BY category_name;

COMMIT;
