-- Migration: Rename teams.name to teams.custom_name
-- Purpose: Clarify that this field is an optional custom identifier, not required
-- Date: 2025-12-07

-- Step 1: Rename the column
ALTER TABLE teams 
RENAME COLUMN name TO custom_name;

-- Step 2: Update the comment to clarify purpose
COMMENT ON COLUMN teams.custom_name IS 'Optional custom identifier for the team. If NULL, display name is generated from category + gender.';

-- Verification query (run after migration)
-- SELECT id, custom_name, category, gender FROM teams LIMIT 10;
