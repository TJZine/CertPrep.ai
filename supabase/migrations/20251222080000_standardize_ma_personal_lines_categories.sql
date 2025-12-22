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

COMMIT;
