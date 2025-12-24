-- Migration: Add Override Columns to Match Convocations
-- Adds columns to store match-specific jersey number and position overrides.

DO $$
BEGIN
    -- 1. Add jersey_number_override if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'match_convocations' 
        AND column_name = 'jersey_number_override'
    ) THEN
        ALTER TABLE match_convocations
        ADD COLUMN jersey_number_override text NULL;
    END IF;

    -- 2. Add position_override if it doesn't exist
    -- Note: We use 'position' to align with player_team_season.position (e.g. OH, MB, L)
    -- 'role_in_match' already exists but is often used for 'captain', 'libero', etc. 
    -- We will add 'position_override' to be explicit about tactical position.
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'match_convocations' 
        AND column_name = 'position_override'
    ) THEN
        ALTER TABLE match_convocations
        ADD COLUMN position_override text NULL;
    END IF;

END $$;
