-- Add missing 'result' column to matches table
-- This column stores the final result text like "Sets: 3-1 (25-22, 23-25, 25-20, 25-18)"

ALTER TABLE matches ADD COLUMN IF NOT EXISTS result TEXT DEFAULT NULL;
