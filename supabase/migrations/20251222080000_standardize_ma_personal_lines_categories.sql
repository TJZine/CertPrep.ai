-- Migration: Standardize Quiz Categories (Comprehensive)
-- Description: Maps legacy granular categories to the 7 Official MAIA Exam Categories.
-- Impact: Updates 'quizzes' table (questions JSONB) and 'results' table (category_breakdown JSONB).

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

            -- Other (Flood -> Tag)
            WHEN elem->>'category' = 'Flood Insurance' THEN 
                jsonb_set(
                    jsonb_set(elem, '{category}', '"Other Coverages and Options"'),
                    '{tags}',
                    COALESCE(elem->'tags', '[]'::jsonb) || '["Flood"]'
                )

            -- Other (Umbrella -> Tag)
            WHEN elem->>'category' = 'Umbrella Liability' THEN 
                jsonb_set(
                    jsonb_set(elem, '{category}', '"Other Coverages and Options"'),
                    '{tags}',
                    COALESCE(elem->'tags', '[]'::jsonb) || '["Umbrella"]'
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
);

-- Note: We are not explicitly updating 'results' table here because complex 
-- score re-calculation (averaging percentages) is better handled by application code 
-- or specialized scripts, whereas this migration handles strict schema enforcement.
-- However, we can perform a simple key replacement for 'results' if needed, 
-- but given the complexity of 'category_breakdown' values, we assume that has been 
-- handled by the one-off scripts.

--------------------------------------------------------------------------------
-- 2. UPDATE RESULTS TABLE (category_breakdown JSONB)
--------------------------------------------------------------------------------
-- Remaps legacy category keys to standardized names, aggregating values when
-- multiple old keys map to the same new key (e.g., "Homeowners Section I" and 
-- "Homeowners Section II" both become "Homeowners Policy").
--
-- Each category_breakdown value has shape: { correct: number, total: number }
-- We SUM these when merging keys.

UPDATE results
SET category_breakdown = (
    SELECT jsonb_object_agg(new_category, jsonb_build_object(
        'correct', SUM((value->>'correct')::int),
        'total', SUM((value->>'total')::int)
    ))
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
            value
        FROM jsonb_each(category_breakdown)
    ) AS mapped
    GROUP BY new_category
)
WHERE category_breakdown IS NOT NULL
  AND category_breakdown != '{}'::jsonb;

COMMIT;
