-- =====================================================
-- VERIFICACIÓN DE ESTADO: Sistema de Coaches
-- =====================================================
-- Este script verifica el estado actual de las tablas
-- relacionadas con coaches antes de la migración
-- =====================================================

-- 1. Verificar si existen las tablas
SELECT 
    'coaches' as tabla,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'coaches'
    ) as existe;

SELECT 
    'coach_team_season' as tabla,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'coach_team_season'
    ) as existe;

SELECT 
    'coach_team_assignments' as tabla,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'coach_team_assignments'
    ) as existe;

-- 2. Contar registros en cada tabla (si existen)
DO $$
DECLARE
    count_cta INTEGER;
    count_coaches INTEGER;
    count_cts INTEGER;
BEGIN
    -- Contar coach_team_assignments
    SELECT COUNT(*) INTO count_cta FROM coach_team_assignments;
    RAISE NOTICE 'coach_team_assignments: % registros', count_cta;
    
    -- Contar coaches (si existe)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coaches') THEN
        SELECT COUNT(*) INTO count_coaches FROM coaches;
        RAISE NOTICE 'coaches: % registros', count_coaches;
    ELSE
        RAISE NOTICE 'Tabla coaches NO existe - necesita crearse';
    END IF;
    
    -- Contar coach_team_season (si existe)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coach_team_season') THEN
        SELECT COUNT(*) INTO count_cts FROM coach_team_season;
        RAISE NOTICE 'coach_team_season: % registros', count_cts;
    ELSE
        RAISE NOTICE 'Tabla coach_team_season NO existe - necesita crearse';
    END IF;
END $$;

-- 3. Ver estructura de coach_team_assignments
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'coach_team_assignments'
ORDER BY ordinal_position;

-- 4. Ver datos actuales en coach_team_assignments
SELECT 
    cta.*,
    p.full_name,
    p.club_id,
    t.custom_name as team_name,
    s.name as season_name
FROM coach_team_assignments cta
LEFT JOIN profiles p ON cta.user_id = p.id
LEFT JOIN teams t ON cta.team_id = t.id
LEFT JOIN seasons s ON cta.season_id = s.id
ORDER BY cta.created_at DESC;

-- 5. Verificar constraints únicos
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name IN ('coach_team_assignments', 'coaches', 'coach_team_season')
ORDER BY tc.table_name, tc.constraint_type;
