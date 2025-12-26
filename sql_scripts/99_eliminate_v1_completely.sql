-- ============================================================================
-- OPERACIÓ: Eliminació Definitiva de V1
-- Data: 2025-12-26
-- Objectiu: V2 (event-sourcing) com a ÚNIC sistema existent
-- ============================================================================

-- IMPORTANT: Executar en STAGING primer, fer backup abans de PRODUCTION
-- Verificar que NO hi ha partits en curs (status = 'in_progress')

BEGIN;

-- ============================================================================
-- FASE 1: BACKUP i VERIFICACIÓ PRE-MIGRACIÓ
-- ============================================================================

-- Crear taula temporal de backup
CREATE TEMP TABLE matches_backup_v1 AS 
SELECT * FROM matches WHERE engine IS NULL OR engine != 'v2';

-- Mostrar resum pre-migració
DO $$
DECLARE
    v1_count INTEGER;
    null_engine_count INTEGER;
    total_matches INTEGER;
BEGIN
    SELECT COUNT(*) INTO v1_count FROM matches WHERE engine = 'v1';
    SELECT COUNT(*) INTO null_engine_count FROM matches WHERE engine IS NULL;
    SELECT COUNT(*) INTO total_matches FROM matches;
    
    RAISE NOTICE '=== PRE-MIGRATION STATUS ===';
    RAISE NOTICE 'Total matches: %', total_matches;
    RAISE NOTICE 'Matches with engine=v1: %', v1_count;
    RAISE NOTICE 'Matches with engine=NULL: %', null_engine_count;
    RAISE NOTICE 'Matches needing migration: %', v1_count + null_engine_count;
    RAISE NOTICE '===========================';
END $$;

-- ============================================================================
-- FASE 2: MIGRACIÓ DE DADES V1 → V2
-- ============================================================================

-- Actualitzar engine a 'v2' i parsejar result → structured data
UPDATE matches
SET 
    engine = 'v2',
    -- Parsejar sets del result text si existeix (inline regexp)
    sets_home = COALESCE(
        sets_home,  -- Mantenir si ja existeix
        -- Parsejar "X-Y" del result
        CASE 
            WHEN result ~ '^([0-9]+)-([0-9]+)' THEN
                CAST(substring(result from '^([0-9]+)-') AS INTEGER)
            ELSE 0
        END,
        0
    ),
    sets_away = COALESCE(
        sets_away,  -- Mantenir si ja existeix
        -- Parsejar "X-Y" del result
        CASE 
            WHEN result ~ '^([0-9]+)-([0-9]+)' THEN
                CAST(substring(result from '-([0-9]+)') AS INTEGER)
            ELSE 0
        END,
        0
    ),
    -- Assegurar points_home/away existeixen (podem calcular després si cal)
    points_home = COALESCE(points_home, 0),
    points_away = COALESCE(points_away, 0),
    -- Assegurar actions NO és null
    actions = COALESCE(actions, '[]'::jsonb),
    -- Marcar com migrat per traçabilitat
    notes = CASE 
        WHEN engine IS NULL OR engine != 'v2' THEN 
            COALESCE(notes || E'\n', '') || '[MIGRATED FROM V1 ON 2025-12-26]'
        ELSE notes
    END
WHERE engine IS NULL OR engine != 'v2';

-- Mostrar resum post-migració
DO $$
DECLARE
    migrated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO migrated_count FROM matches WHERE notes LIKE '%MIGRATED FROM V1%';
    RAISE NOTICE '=== POST-MIGRATION STATUS ===';
    RAISE NOTICE 'Matches migrated: %', migrated_count;
    RAISE NOTICE '==============================';
END $$;

-- ============================================================================
-- FASE 3: ENFORCING V2 SCHEMA
-- ============================================================================

-- 3.1 Set NOT NULL constraints amb defaults
ALTER TABLE matches ALTER COLUMN engine SET NOT NULL;
ALTER TABLE matches ALTER COLUMN engine SET DEFAULT 'v2';

ALTER TABLE matches ALTER COLUMN sets_home SET NOT NULL;
ALTER TABLE matches ALTER COLUMN sets_home SET DEFAULT 0;

ALTER TABLE matches ALTER COLUMN sets_away SET NOT NULL;
ALTER TABLE matches ALTER COLUMN sets_away SET DEFAULT 0;

ALTER TABLE matches ALTER COLUMN points_home SET NOT NULL;
ALTER TABLE matches ALTER COLUMN points_home SET DEFAULT 0;

ALTER TABLE matches ALTER COLUMN points_away SET NOT NULL;
ALTER TABLE matches ALTER COLUMN points_away SET DEFAULT 0;

ALTER TABLE matches ALTER COLUMN actions SET NOT NULL;
ALTER TABLE matches ALTER COLUMN actions SET DEFAULT '[]'::jsonb;

-- 3.2 Add CHECK constraint per forçar només 'v2'
ALTER TABLE matches ADD CONSTRAINT matches_engine_v2_only 
    CHECK (engine = 'v2');

-- ============================================================================
-- FASE 4: ELIMINAR CAMPS LEGACY V1
-- ============================================================================

-- ATENCIÓ: Això és IRREVERSIBLE. Assegura't del backup!

-- Eliminar columnes V1
ALTER TABLE matches DROP COLUMN IF EXISTS result;
ALTER TABLE matches DROP COLUMN IF EXISTS our_sets;
ALTER TABLE matches DROP COLUMN IF EXISTS opponent_sets;

-- ============================================================================
-- FASE 5: VERIFICACIÓ POST-MIGRACIÓ
-- ============================================================================

-- Test 1: No hi ha partits amb engine != 'v2'
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count FROM matches WHERE engine != 'v2';
    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'MIGRATION FAILED: % matches with engine != v2', invalid_count;
    ELSE
        RAISE NOTICE '✓ Test 1 PASSED: All matches have engine=v2';
    END IF;
END $$;

-- Test 2: No hi ha actions NULL
DO $$
DECLARE
    null_actions_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_actions_count FROM matches WHERE actions IS NULL;
    IF null_actions_count > 0 THEN
        RAISE EXCEPTION 'MIGRATION FAILED: % matches with NULL actions', null_actions_count;
    ELSE
        RAISE NOTICE '✓ Test 2 PASSED: All matches have actions (not null)';
    END IF;
END $$;

-- Test 3: Verificar que columnes V1 NO existeixen
DO $$
BEGIN
    -- Intentar seleccionar 'result' hauria de fallar
    PERFORM column_name FROM information_schema.columns 
    WHERE table_name = 'matches' AND column_name = 'result';
    
    IF FOUND THEN
        RAISE EXCEPTION 'MIGRATION FAILED: Column "result" still exists';
    ELSE
        RAISE NOTICE '✓ Test 3 PASSED: Legacy column "result" does not exist';
    END IF;
END $$;

-- Test 4: CHECK constraint existeix
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'matches_engine_v2_only'
    ) INTO constraint_exists;
    
    IF NOT constraint_exists THEN
        RAISE EXCEPTION 'MIGRATION FAILED: CHECK constraint not found';
    ELSE
        RAISE NOTICE '✓ Test 4 PASSED: CHECK constraint engine=v2 exists';
    END IF;
END $$;

-- Test 5: Intentar insertar match amb engine != 'v2' ha de fallar
DO $$
BEGIN
    INSERT INTO matches (
        id, club_id, season_id, team_id, 
        opponent_name, match_date, home_away, status, engine
    ) VALUES (
        gen_random_uuid(), 
        (SELECT id FROM clubs LIMIT 1),
        (SELECT id FROM seasons LIMIT 1),
        (SELECT id FROM teams LIMIT 1),
        'Test Opponent', 
        NOW(), 
        'home', 
        'scheduled',
        'v1'  -- Això hauria de fallar!
    );
    
    RAISE EXCEPTION 'MIGRATION FAILED: Could insert match with engine=v1';
EXCEPTION
    WHEN check_violation THEN
        RAISE NOTICE '✓ Test 5 PASSED: Cannot insert matches with engine != v2';
    WHEN OTHERS THEN
        RAISE EXCEPTION 'MIGRATION FAILED: Unexpected error in test 5';
END $$;

-- ============================================================================
-- RESUM FINAL
-- ============================================================================

DO $$
DECLARE
    total_matches INTEGER;
    v2_matches INTEGER;
    migrated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_matches FROM matches;
    SELECT COUNT(*) INTO v2_matches FROM matches WHERE engine = 'v2';
    SELECT COUNT(*) INTO migrated_count FROM matches WHERE notes LIKE '%MIGRATED FROM V1%';
    
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE '    V1 ELIMINATION COMPLETED SUCCESSFULLY';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Total matches in DB: %', total_matches;
    RAISE NOTICE 'Matches with engine=v2: % (100%%)', v2_matches;
    RAISE NOTICE 'Matches migrated from V1: %', migrated_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Legacy columns removed: result, our_sets, opponent_sets';
    RAISE NOTICE 'CHECK constraint added: engine = ''v2'' (enforced)';
    RAISE NOTICE 'Default values set: engine=''v2'', actions=''[]''';
    RAISE NOTICE '';
    RAISE NOTICE '✓ All tests PASSED';
    RAISE NOTICE '✓ V1 system ELIMINATED';
    RAISE NOTICE '✓ V2 (event-sourcing) is now the ONLY system';
    RAISE NOTICE '================================================';
END $$;

-- Cleanup backup temporal
DROP TABLE IF EXISTS matches_backup_v1;

COMMIT;

-- ============================================================================
-- POST-MIGRATION MANUAL CHECKS
-- ============================================================================

-- Query 1: Verify no NULL engines
SELECT COUNT(*) as should_be_zero FROM matches WHERE engine IS NULL;

-- Query 2: Verify all are 'v2'
SELECT COUNT(*) as should_be_total FROM matches WHERE engine = 'v2';

-- Query 3: Verify no NULL actions
SELECT COUNT(*) as should_be_zero FROM matches WHERE actions IS NULL;

-- Query 4: Check migrated matches
SELECT id, opponent_name, match_date, sets_home, sets_away, 
       LENGTH(actions::text) as actions_size
FROM matches 
WHERE notes LIKE '%MIGRATED FROM V1%'
LIMIT 10;

-- Query 5: Verify columns don't exist (should ERROR)
-- SELECT result FROM matches LIMIT 1;  -- Uncomment to test

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (si cal)
-- ============================================================================

-- Si alguna cosa ha anat malament i cal fer rollback:
-- 1. ROLLBACK; (si encara dins de la transacció)
-- 2. Restaurar des del backup: 
--    - Temporal table: matches_backup_v1 (només dins de sessió)
--    - O restaurar des de backup extern de BD
-- 
-- IMPORTANT: Un cop fet COMMIT i DROP columns, NO es pot desfer!
-- Per això és CRÍTIC executar primer a STAGING
