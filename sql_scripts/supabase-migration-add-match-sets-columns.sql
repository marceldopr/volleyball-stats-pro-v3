-- Migration: Add our_sets and opponent_sets columns to matches table
-- Description: Add structured numeric columns for match results to improve calculation robustness
-- Date: 2024-12-06
-- Author: Technical Audit Improvement

-- ============================================
-- STEP 1: Add new columns
-- ============================================

ALTER TABLE matches
ADD COLUMN our_sets SMALLINT,
ADD COLUMN opponent_sets SMALLINT;

-- ============================================
-- STEP 2: Backfill data from existing result field
-- ============================================

-- This UPDATE will only affect rows where:
-- 1. result is NOT NULL
-- 2. result contains exactly one hyphen '-'
-- 3. Both parts (before and after '-') are numeric

UPDATE matches
SET
    our_sets = split_part(result, '-', 1)::SMALLINT,
    opponent_sets = split_part(result, '-', 2)::SMALLINT
WHERE
    result IS NOT NULL
    AND position('-' IN result) > 0
    AND result !~ '-.*-'                         -- assegura que no hi ha un segon guió
    AND split_part(result, '-', 1) ~ '^[0-9]+$'
    AND split_part(result, '-', 2) ~ '^[0-9]+$';

-- ============================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================

-- Check how many rows were updated successfully
-- SELECT COUNT(*) as updated_rows
-- FROM matches
-- WHERE our_sets IS NOT NULL AND opponent_sets IS NOT NULL;

-- Check rows with invalid result format (should remain NULL)
-- SELECT id, result, our_sets, opponent_sets
-- FROM matches
-- WHERE result IS NOT NULL AND (our_sets IS NULL OR opponent_sets IS NULL);

-- Check sample of updated rows
-- SELECT id, result, our_sets, opponent_sets, status
-- FROM matches
-- WHERE our_sets IS NOT NULL
-- LIMIT 10;

-- ============================================
-- NOTES
-- ============================================

-- - The 'result' column is NOT modified or deleted
-- - Rows with invalid 'result' format will have NULL in new columns
-- - No NOT NULL constraints are added (for backward compatibility)
-- - This migration is safe to run on production data
