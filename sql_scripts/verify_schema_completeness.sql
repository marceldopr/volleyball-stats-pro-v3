-- =====================================================
-- EXPORTAR SCHEMA COMPLETO DE SUPABASE
-- =====================================================
-- Este script extrae toda la estructura de la base de datos
-- para comparar con SCHEMA.md y verificar que está completo
-- =====================================================

-- 1. Listar todas las tablas del schema público
SELECT 
    table_name,
    (SELECT COUNT(*) 
     FROM information_schema.columns 
     WHERE table_schema = 'public' 
     AND table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. Exportar estructura completa (formato compatible con SCHEMA.md)
SELECT 
    table_name as "Taula",
    column_name as "Camp", 
    data_type as "Tipus",
    CASE WHEN is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END as "Nullable"
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 3. Contar tablas documentadas vs. existentes
WITH documented_tables AS (
    -- Tablas que deberían estar documentadas en SCHEMA.md
    SELECT UNNEST(ARRAY[
        'club_categories', 'club_identifiers', 'club_players', 'club_promotion_routes',
        'clubs', 'coach_reports', 'coaches', 'coach_team_season', 'coach_team_assignments',
        'coach_signup_tokens',
        'match_convocations', 'match_player_set_stats', 'matches',
        'player_documents', 'player_guardians', 'player_injuries', 'player_measurements',
        'player_reports', 'player_team_season', 'player_team_season_evaluations',
        'profiles', 'reports', 'seasons',
        'team_season_context', 'team_season_phases', 'team_season_plan', 'teams',
        'training_attendance', 'training_phase_evaluation', 'trainings'
    ]) as table_name
),
actual_tables AS (
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
)
SELECT 
    'Tablas solo en base de datos (no documentadas)' as tipo,
    string_agg(table_name, ', ') as tablas
FROM actual_tables
WHERE table_name NOT IN (SELECT table_name FROM documented_tables)
UNION ALL
SELECT 
    'Tablas solo en documentación (no existen)' as tipo,
    string_agg(table_name, ', ') as tablas
FROM documented_tables
WHERE table_name NOT IN (SELECT table_name FROM actual_tables);

-- 4. Verificar campos de tablas específicas importantes
SELECT 
    'coaches' as tabla,
    COUNT(*) as campos_actuales,
    16 as campos_documentados,
    CASE 
        WHEN COUNT(*) = 16 THEN '✅ Correcto'
        WHEN COUNT(*) > 16 THEN '⚠️ Faltan documentar ' || (COUNT(*) - 16)::text || ' campos'
        ELSE '⚠️ Sobran ' || (16 - COUNT(*))::text || ' campos en documentación'
    END as estado
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'coaches'

UNION ALL

SELECT 
    'coach_team_season' as tabla,
    COUNT(*) as campos_actuales,
    8 as campos_documentados,
    CASE 
        WHEN COUNT(*) = 8 THEN '✅ Correcto'
        WHEN COUNT(*) > 8 THEN '⚠️ Faltan documentar ' || (COUNT(*) - 8)::text || ' campos'
        ELSE '⚠️ Sobran ' || (8 - COUNT(*))::text || ' campos en documentación'
    END as estado
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'coach_team_season'

UNION ALL

SELECT 
    'teams' as tabla,
    COUNT(*) as campos_actuales,
    16 as campos_documentados,
    CASE 
        WHEN COUNT(*) = 16 THEN '✅ Correcto'
        WHEN COUNT(*) > 16 THEN '⚠️ Faltan documentar ' || (COUNT(*) - 16)::text || ' campos'
        ELSE '⚠️ Sobran ' || (16 - COUNT(*))::text || ' campos en documentación'
    END as estado
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'teams';

-- 5. Exportar campos de coaches y coach_team_season para verificar
SELECT 
    '=== COACHES ===' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'coaches'
ORDER BY ordinal_position;

SELECT 
    '=== COACH_TEAM_SEASON ===' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'coach_team_season'
ORDER BY ordinal_position;

-- 6. Resumen final
SELECT 
    (SELECT COUNT(*) FROM information_schema.tables 
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as total_tablas_supabase,
    (SELECT COUNT(DISTINCT table_name) FROM information_schema.columns 
     WHERE table_schema = 'public') as tablas_con_columnas,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = 'public') as total_columnas;
