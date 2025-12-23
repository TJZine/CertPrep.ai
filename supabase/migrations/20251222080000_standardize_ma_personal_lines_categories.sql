-- Migration: Standardize Quiz Categories (Comprehensive)
-- Description: Maps legacy granular categories to the 7 Official MAIA Exam Categories.
-- Impact: Updates 'quizzes' table (questions JSONB) and 'results' table (category_breakdown JSONB).
--
-- Note: This migration was used to fix data for test users (2025-12-22).
-- It has been corrected to handle edge cases safely if ever re-referenced.

BEGIN;

--------------------------------------------------------------------------------
-- 1. UPDATE QUIZZES TABLE (Questions JSONB)
--------------------------------------------------------------------------------

UPDATE quizzes
SET questions = (
    SELECT jsonb_agg(
        CASE
            -- Homeowners
            WHEN elem->>'category' IN (
                'Homeowners Section I', 'Homeowners Section II', 'Homeowners Forms', 
                'Homeowners Endorsements', 'Homeowners Coverages', 'Homeowners Conditions', 
                'Homeowners Eligibility', 'Homeowners Liability', 'Homeowners Policy'
            ) THEN jsonb_set(elem, '{category}', '"Homeowners Policy"')

            -- Auto
            WHEN elem->>'category' IN (
                'MA Personal Auto', 'MA Auto Policy', 'Massachusetts Auto Policy', 'Auto Insurance'
            ) THEN jsonb_set(elem, '{category}', '"Auto Insurance"')

            -- Property & Casualty
            WHEN elem->>'category' IN (
                'Property Basics', 'Liability Basics', 'Contract Law', 
                'Property & Casualty Basics', 'Property & Liability Basics', 
                'Property and Casualty Basics', 'Insurance Contracts', 
                'Liability Insurance', 'Loss Settlement', 'Property and Casualty Insurance Basics'
            ) THEN jsonb_set(elem, '{category}', '"Property and Casualty Insurance Basics"')

            -- Dwelling
            WHEN elem->>'category' IN (
                'Dwelling Policies', 'Dwelling Property', 'Dwelling Policy'
            ) THEN jsonb_set(elem, '{category}', '"Dwelling Policy"')

            -- Regulation
            WHEN elem->>'category' IN (
                'MA Insurance Law', 'Producer Authority', 'Insurance Regulation'
            ) THEN jsonb_set(elem, '{category}', '"Insurance Regulation"')

            -- General
            WHEN elem->>'category' IN (
                'General Insurance Basics', 'Types of Insurers', 'Risk Management', 
                'Underwriting', 'General Insurance Concepts', 'General Insurance'
            ) THEN jsonb_set(elem, '{category}', '"General Insurance"')

            -- Other (Flood -> Tag) - Prevent duplicate tags
            WHEN elem->>'category' = 'Flood Insurance' THEN 
                jsonb_set(
                    jsonb_set(elem, '{category}', '"Other Coverages and Options"'),
                    '{tags}',
                    CASE 
                        WHEN COALESCE(elem->'tags', '[]'::jsonb) @> '["Flood"]'::jsonb 
                        THEN COALESCE(elem->'tags', '[]'::jsonb)
                        ELSE COALESCE(elem->'tags', '[]'::jsonb) || '["Flood"]'
                    END
                )

            -- Other (Umbrella -> Tag) - Prevent duplicate tags
            WHEN elem->>'category' = 'Umbrella Liability' THEN 
                jsonb_set(
                    jsonb_set(elem, '{category}', '"Other Coverages and Options"'),
                    '{tags}',
                    CASE 
                        WHEN COALESCE(elem->'tags', '[]'::jsonb) @> '["Umbrella"]'::jsonb 
                        THEN COALESCE(elem->'tags', '[]'::jsonb)
                        ELSE COALESCE(elem->'tags', '[]'::jsonb) || '["Umbrella"]'
                    END
                )

            -- Other (Simple Mapping)
            WHEN elem->>'category' IN (
                'Inland Marine', 'Marine Insurance', 'Other Coverages and Options'
            ) THEN jsonb_set(elem, '{category}', '"Other Coverages and Options"')

            -- Default (Keep existing)
            ELSE elem
        END
    )
    FROM jsonb_array_elements(questions) AS elem
)
-- Only update rows that need changes (NULL/empty protection)
WHERE questions IS NOT NULL
  AND jsonb_typeof(questions) = 'array'
  AND jsonb_array_length(questions) > 0
  AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(questions) AS e
      WHERE e->>'category' IN (
          'Homeowners Section I', 'Homeowners Section II', 'MA Personal Auto',
          'Property & Casualty Basics', 'Property Basics', 'Liability Basics',
          'Dwelling Policies', 'MA Insurance Law', 'General Insurance Basics',
          'Flood Insurance', 'Umbrella Liability', 'Inland Marine',
          'Contract Law', 'Property & Liability Basics', 'MA Auto Policy',
          'Massachusetts Auto Policy', 'Homeowners Forms', 'Homeowners Endorsements',
          'Homeowners Coverages', 'Homeowners Conditions', 'Homeowners Eligibility',
          'Homeowners Liability', 'Types of Insurers', 'Risk Management',
          'Underwriting', 'General Insurance Concepts', 'Dwelling Property',
          'Producer Authority', 'Property and Casualty Basics',
          'Insurance Contracts', 'Loss Settlement', 'Marine Insurance',
          'Liability Insurance'
      )
  );

--------------------------------------------------------------------------------
-- 2. UPDATE RESULTS TABLE (category_breakdown JSONB)
--------------------------------------------------------------------------------
-- Remaps legacy category keys to standardized names, aggregating values when
-- multiple old keys map to the same new key (e.g., "Homeowners Section I" and 
-- "Homeowners Section II" both become "Homeowners Policy").
--
-- For object values with {correct, total}: SUM the raw counts, then compute percentage.
-- For numeric values (already percentages): Keep as-is (cannot reconstruct counts).
-- Categories with no valid data are EXCLUDED (not set to 0).

UPDATE results r
SET category_breakdown = aggregated.new_breakdown
FROM (
    SELECT 
        r2.id,
        (
            SELECT jsonb_object_agg(agg.new_category, agg.final_percentage)
            FROM (
                SELECT
                    new_category,
                    -- If we have count data, use pooled calculation; else average the percentages
                    CASE 
                        WHEN SUM(total_count) > 0 THEN 
                            ROUND((SUM(correct_count) / SUM(total_count)) * 100)
                        WHEN COUNT(pct_value) > 0 THEN 
                            ROUND(AVG(pct_value))
                        ELSE NULL
                    END AS final_percentage
                FROM (
                    SELECT
                        CASE key
                            -- Homeowners
                            WHEN 'Homeowners Section I' THEN 'Homeowners Policy'
                            WHEN 'Homeowners Section II' THEN 'Homeowners Policy'
                            WHEN 'Homeowners Forms' THEN 'Homeowners Policy'
                            WHEN 'Homeowners Endorsements' THEN 'Homeowners Policy'
                            WHEN 'Homeowners Coverages' THEN 'Homeowners Policy'
                            WHEN 'Homeowners Conditions' THEN 'Homeowners Policy'
                            WHEN 'Homeowners Eligibility' THEN 'Homeowners Policy'
                            WHEN 'Homeowners Liability' THEN 'Homeowners Policy'
                            -- Auto
                            WHEN 'MA Personal Auto' THEN 'Auto Insurance'
                            WHEN 'MA Auto Policy' THEN 'Auto Insurance'
                            WHEN 'Massachusetts Auto Policy' THEN 'Auto Insurance'
                            -- Property & Casualty
                            WHEN 'Property Basics' THEN 'Property and Casualty Insurance Basics'
                            WHEN 'Liability Basics' THEN 'Property and Casualty Insurance Basics'
                            WHEN 'Liability Insurance' THEN 'Property and Casualty Insurance Basics'
                            WHEN 'Contract Law' THEN 'Property and Casualty Insurance Basics'
                            WHEN 'Property & Casualty Basics' THEN 'Property and Casualty Insurance Basics'
                            WHEN 'Property & Liability Basics' THEN 'Property and Casualty Insurance Basics'
                            WHEN 'Property and Casualty Basics' THEN 'Property and Casualty Insurance Basics'
                            WHEN 'Insurance Contracts' THEN 'Property and Casualty Insurance Basics'
                            WHEN 'Loss Settlement' THEN 'Property and Casualty Insurance Basics'
                            -- Dwelling
                            WHEN 'Dwelling Policies' THEN 'Dwelling Policy'
                            WHEN 'Dwelling Property' THEN 'Dwelling Policy'
                            -- Regulation
                            WHEN 'MA Insurance Law' THEN 'Insurance Regulation'
                            WHEN 'Producer Authority' THEN 'Insurance Regulation'
                            -- General
                            WHEN 'General Insurance Basics' THEN 'General Insurance'
                            WHEN 'Types of Insurers' THEN 'General Insurance'
                            WHEN 'Risk Management' THEN 'General Insurance'
                            WHEN 'Underwriting' THEN 'General Insurance'
                            WHEN 'General Insurance Concepts' THEN 'General Insurance'
                            -- Other
                            WHEN 'Flood Insurance' THEN 'Other Coverages and Options'
                            WHEN 'Umbrella Liability' THEN 'Other Coverages and Options'
                            WHEN 'Inland Marine' THEN 'Other Coverages and Options'
                            WHEN 'Marine Insurance' THEN 'Other Coverages and Options'
                            -- Keep already-standardized or unknown keys
                            ELSE key
                        END AS new_category,
                        -- Extract counts if object format
                        CASE 
                            WHEN jsonb_typeof(value) = 'object' AND value ? 'correct' AND value ? 'total'
                            THEN (value->>'correct')::numeric 
                            ELSE NULL
                        END AS correct_count,
                        CASE 
                            WHEN jsonb_typeof(value) = 'object' AND value ? 'correct' AND value ? 'total'
                            THEN NULLIF((value->>'total')::numeric, 0)
                            ELSE NULL
                        END AS total_count,
                        -- Extract percentage if numeric format
                        CASE 
                            WHEN jsonb_typeof(value) = 'number' THEN (value)::numeric
                            ELSE NULL
                        END AS pct_value
                    FROM jsonb_each(r2.category_breakdown)
                ) mapped
                GROUP BY new_category
                HAVING 
                    SUM(total_count) > 0 OR COUNT(pct_value) > 0
            ) agg
            WHERE agg.final_percentage IS NOT NULL
        ) AS new_breakdown
    FROM results r2
    WHERE r2.category_breakdown IS NOT NULL
      AND r2.category_breakdown != '{}'::jsonb
) aggregated
WHERE r.id = aggregated.id
  AND aggregated.new_breakdown IS NOT NULL;

COMMIT;

