-- Migration: Normalize computed_category_scores keys
-- Date: 2025-12-25
-- Description: Maps legacy category keys to official 7 categories in computed_category_scores JSONB.
-- Scope: Only affects 4 results with legacy keys (verified via backup_20251225.json)
--
-- BACKUP: /Users/tristan/Software/CertPrep.ai/backup_20251225.json
-- RUN THIS IN SUPABASE SQL EDITOR - DO NOT USE AS MIGRATION FILE

BEGIN;

-- Update computed_category_scores for results with legacy category keys
-- Uses the same mapping as the existing 20251222 migration
UPDATE results r
SET computed_category_scores = aggregated.new_scores
FROM (
    SELECT 
        r2.id,
        (
            SELECT jsonb_object_agg(
                agg.new_category,
                jsonb_build_object('correct', agg.sum_correct, 'total', agg.sum_total)
            )
            FROM (
                SELECT
                    new_category,
                    SUM((value->>'correct')::int) AS sum_correct,
                    SUM((value->>'total')::int) AS sum_total
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
                        value
                    FROM jsonb_each(r2.computed_category_scores)
                ) mapped
                GROUP BY new_category
            ) agg
        ) AS new_scores
    FROM results r2
    WHERE r2.id IN (
        -- Only the 4 results with legacy keys (verified from backup)
        '492771be-cf53-498c-aed5-10b71de74fd5',
        'dec64c7a-8c84-444e-b440-8eab88b46f0b',
        '4b2c59a1-0899-4d23-88e0-91f271f20d0a',
        'b8ffbcbb-733c-4371-b39e-1d39d303dab6'
    )
) aggregated
WHERE r.id = aggregated.id;

-- Verify the update
SELECT id, computed_category_scores
FROM results
WHERE id IN (
    '492771be-cf53-498c-aed5-10b71de74fd5',
    'dec64c7a-8c84-444e-b440-8eab88b46f0b',
    '4b2c59a1-0899-4d23-88e0-91f271f20d0a',
    'b8ffbcbb-733c-4371-b39e-1d39d303dab6'
);

COMMIT;
