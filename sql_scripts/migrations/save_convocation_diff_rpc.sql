-- Migration: Secure Convocation Save (Diff + Unique Constraint)

-- 1. Ensure Unique Constraint exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'match_convocations_match_id_player_id_key'
    ) THEN
        ALTER TABLE match_convocations
        ADD CONSTRAINT match_convocations_match_id_player_id_key UNIQUE (match_id, player_id);
    END IF;
END $$;

-- 2. Create RPC Function for Atomic Diff Save
CREATE OR REPLACE FUNCTION save_match_convocation_diff(
    p_match_id UUID,
    p_team_id UUID,
    p_season_id UUID,
    p_player_ids UUID[]
)
RETURNS VOID AS $$
DECLARE
    existing_ids UUID[];
    to_delete UUID[];
    to_insert UUID[];
    pid UUID;
BEGIN
    -- Get existing player IDs for this match
    SELECT ARRAY_AGG(player_id) INTO existing_ids
    FROM match_convocations
    WHERE match_id = p_match_id;

    -- Handle null array if empty
    IF existing_ids IS NULL THEN
        existing_ids := ARRAY[]::UUID[];
    END IF;

    -- Calculate Diff
    -- TO DELETE: In existing BUT NOT in new list
    SELECT ARRAY_AGG(u) INTO to_delete
    FROM (
        SELECT UNNEST(existing_ids)
        EXCEPT
        SELECT UNNEST(p_player_ids)
    ) t(u);

    -- TO INSERT: In new list BUT NOT in existing
    SELECT ARRAY_AGG(u) INTO to_insert
    FROM (
        SELECT UNNEST(p_player_ids)
        EXCEPT
        SELECT UNNEST(existing_ids)
    ) t(u);

    -- PERFORM UPDATES
    
    -- 1. Delete removed players
    IF to_delete IS NOT NULL THEN
        DELETE FROM match_convocations
        WHERE match_id = p_match_id
        AND player_id = ANY(to_delete);
    END IF;

    -- 2. Insert new players
    IF to_insert IS NOT NULL THEN
        FOREACH pid IN ARRAY to_insert
        LOOP
            INSERT INTO match_convocations (
                match_id, 
                team_id, 
                season_id, 
                player_id, 
                status, 
                created_at, 
                updated_at
            ) VALUES (
                p_match_id, 
                p_team_id, 
                p_season_id, 
                pid, 
                'convocado', 
                NOW(), 
                NOW()
            )
            ON CONFLICT (match_id, player_id) DO NOTHING; -- Safety net
        END LOOP;
    END IF;

END;
$$ LANGUAGE plpgsql;
