-- ROLLBACK Script for: Add our_sets and opponent_sets columns
-- Description: Remove the added columns if needed
-- Date: 2024-12-06
-- Execute manually in Supabase SQL Editor if rollback is needed

ALTER TABLE matches
DROP COLUMN IF EXISTS our_sets,
DROP COLUMN IF EXISTS opponent_sets;
