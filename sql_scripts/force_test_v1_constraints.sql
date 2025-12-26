-- ============================================================================
-- V1 ELIMINATION - FORCE TESTS (Kill Certificate)
-- ============================================================================
-- IMPORTANT: This runs in a transaction and ROLLBACK at the end
-- NO data will be persisted - only testing constraints
-- ============================================================================

BEGIN;

-- ============================================================================
-- TEST A: INSERT with engine='v1' → MUST FAIL (CHECK constraint)
-- ============================================================================

DO $$
DECLARE
    test_club_id UUID;
    test_season_id UUID;
    test_team_id UUID;
    error_message TEXT;
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'TEST A: INSERT with engine = v1';
    RAISE NOTICE '============================================';
    
    SELECT id INTO test_club_id FROM clubs LIMIT 1;
    SELECT id INTO test_season_id FROM seasons LIMIT 1;
    SELECT id INTO test_team_id FROM teams LIMIT 1;
    
    BEGIN
        INSERT INTO matches (
            id, club_id, season_id, team_id,
            opponent_name, match_date, home_away, status,
            engine, actions, sets_home, sets_away, points_home, points_away
        ) VALUES (
            gen_random_uuid(),
            test_club_id,
            test_season_id,
            test_team_id,
            'Force Test Opponent A',
            NOW(),
            'home',
            'scheduled',
            'v1',        -- ❌ This MUST FAIL
            '[]'::jsonb,
            0, 0, 0, 0
        );
        
        RAISE EXCEPTION 'TEST A FAILED: INSERT with engine=v1 was allowed!';
        
    EXCEPTION
        WHEN check_violation THEN
            GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
            RAISE NOTICE '✓ TEST A PASSED: INSERT correctly rejected';
            RAISE NOTICE '  Error: %', error_message;
        WHEN OTHERS THEN
            RAISE EXCEPTION 'TEST A FAILED: Unexpected error';
    END;
END $$;

-- ============================================================================
-- TEST B: UPDATE to engine='v1' → MUST FAIL (CHECK constraint)
-- ============================================================================

DO $$
DECLARE
    existing_match_id UUID;
    error_message TEXT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'TEST B: UPDATE existing match to engine = v1';
    RAISE NOTICE '============================================';
    
    SELECT id INTO existing_match_id FROM matches LIMIT 1;
    
    IF existing_match_id IS NULL THEN
        RAISE NOTICE '⚠ TEST B SKIPPED: No existing matches';
        RETURN;
    END IF;
    
    BEGIN
        UPDATE matches 
        SET engine = 'v1'  -- ❌ This MUST FAIL
        WHERE id = existing_match_id;
        
        RAISE EXCEPTION 'TEST B FAILED: UPDATE to engine=v1 was allowed!';
        
    EXCEPTION
        WHEN check_violation THEN
            GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
            RAISE NOTICE '✓ TEST B PASSED: UPDATE correctly rejected';
            RAISE NOTICE '  Error: %', error_message;
        WHEN OTHERS THEN
            RAISE EXCEPTION 'TEST B FAILED: Unexpected error';
    END;
END $$;

-- ============================================================================
-- TEST C: INSERT with engine=NULL → MUST FAIL (NOT NULL constraint)
-- ============================================================================

DO $$
DECLARE
    test_club_id UUID;
    test_season_id UUID;
    test_team_id UUID;
    error_message TEXT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'TEST C: INSERT with engine = NULL';
    RAISE NOTICE '============================================';
    
    SELECT id INTO test_club_id FROM clubs LIMIT 1;
    SELECT id INTO test_season_id FROM seasons LIMIT 1;
    SELECT id INTO test_team_id FROM teams LIMIT 1;
    
    BEGIN
        INSERT INTO matches (
            id, club_id, season_id, team_id,
            opponent_name, match_date, home_away, status,
            engine, actions, sets_home, sets_away, points_home, points_away
        ) VALUES (
            gen_random_uuid(),
            test_club_id,
            test_season_id,
            test_team_id,
            'Force Test Opponent C',
            NOW(),
            'home',
            'scheduled',
            NULL,        -- ❌ This MUST FAIL
            '[]'::jsonb,
            0, 0, 0, 0
        );
        
        RAISE EXCEPTION 'TEST C FAILED: INSERT with engine=NULL was allowed!';
        
    EXCEPTION
        WHEN not_null_violation THEN
            GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
            RAISE NOTICE '✓ TEST C PASSED: INSERT correctly rejected';
            RAISE NOTICE '  Error: %', error_message;
        WHEN OTHERS THEN
            RAISE EXCEPTION 'TEST C FAILED: Unexpected error';
    END;
END $$;

    -- ============================================================================
    -- TEST D: INSERT with actions=NULL → MUST FAIL (NOT NULL constraint)
    -- ============================================================================

    DO $$
    DECLARE
        test_club_id UUID;
        test_season_id UUID;
        test_team_id UUID;
        error_message TEXT;
    BEGIN
        RAISE NOTICE '';
        RAISE NOTICE '============================================';
        RAISE NOTICE 'TEST D: INSERT with actions = NULL';
        RAISE NOTICE '============================================';
        
        SELECT id INTO test_club_id FROM clubs LIMIT 1;
        SELECT id INTO test_season_id FROM seasons LIMIT 1;
        SELECT id INTO test_team_id FROM teams LIMIT 1;
        
        BEGIN
            INSERT INTO matches (
                id, club_id, season_id, team_id,
                opponent_name, match_date, home_away, status,
                engine, actions, sets_home, sets_away, points_home, points_away
            ) VALUES (
                gen_random_uuid(),
                test_club_id,
                test_season_id,
                test_team_id,
                'Force Test Opponent D',
                NOW(),
                'home',
                'scheduled',
                'v2',
                NULL,        -- ❌ This MUST FAIL
                0, 0, 0, 0
            );
            
            RAISE EXCEPTION 'TEST D FAILED: INSERT with actions=NULL was allowed!';
            
        EXCEPTION
            WHEN not_null_violation THEN
                GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
                RAISE NOTICE '✓ TEST D PASSED: INSERT correctly rejected';
                RAISE NOTICE '  Error: %', error_message;
            WHEN OTHERS THEN
                RAISE EXCEPTION 'TEST D FAILED: Unexpected error';
        END;
    END $$;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'FINAL VERIFICATION';
    RAISE NOTICE '============================================';
    
    SELECT COUNT(*) INTO invalid_count 
    FROM matches 
    WHERE engine != 'v2' OR engine IS NULL OR actions IS NULL;
    
    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: % invalid matches found!', invalid_count;
    ELSE
        RAISE NOTICE '✓ VERIFICATION PASSED: 0 invalid matches';
    END IF;
    
    RAISE NOTICE 'Result: % invalid matches', invalid_count;
END $$;

-- ============================================================================
-- ROLLBACK - NO DATA PERSISTED
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'ROLLING BACK TRANSACTION';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'No test data persisted.';
    RAISE NOTICE '';
END $$;

ROLLBACK;

-- ============================================================================
-- POST-ROLLBACK VERIFICATION
-- ============================================================================

-- Verify no test data exists
SELECT COUNT(*) as test_matches_count 
FROM matches 
WHERE opponent_name LIKE 'Force Test Opponent%';

-- Expected: 0

-- Final check: All valid
SELECT COUNT(*) as should_be_zero 
FROM matches 
WHERE engine != 'v2' OR engine IS NULL OR actions IS NULL;

-- Expected: 0

-- ============================================================================
-- If all 4 tests PASSED and both queries return 0: V1 KILL CERTIFICATE ✅☠️
-- ============================================================================
