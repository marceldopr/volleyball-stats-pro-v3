-- =====================================================
-- REPORTE COMPLETO DE SCHEMA - Consultas separadas
-- =====================================================

-- 1. Todas las tablas con conteo de columnas
SELECT 
    table_name,
    COUNT(*) as num_columnas
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;

-- 2. Tablas que NO están documentadas en SCHEMA.md
SELECT 
    table_name,
    'Esta tabla existe pero puede no estar documentada' as nota
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
AND table_name NOT IN (
    'club_categories', 'club_identifiers', 'club_players', 'club_promotion_routes',
    'clubs', 'coach_reports', 'coaches', 'coach_team_season', 'coach_team_assignments',
    'coach_signup_tokens',
    'match_convocations', 'match_player_set_stats', 'matches',
    'player_documents', 'player_guardians', 'player_injuries', 'player_measurements',
    'player_reports', 'player_team_season', 'player_team_season_evaluations',
    'profiles', 'reports', 'seasons',
    'team_season_context', 'team_season_phases', 'team_season_plan', 'teams',
    'training_attendance', 'training_phase_evaluation', 'trainings'
)
ORDER BY table_name;

-- 3. Campos de la tabla COACHES
SELECT 
    column_name,
    data_type,
    CASE WHEN is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END as nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'coaches'
ORDER BY ordinal_position;

-- 4. Campos de la tabla COACH_TEAM_SEASON
SELECT 
    column_name,
    data_type,
    CASE WHEN is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END as nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'coach_team_season'
ORDER BY ordinal_position;

-- 5. Resumen general
SELECT 
    'Total tablas' as metrica,
    COUNT(*)::text as valor
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
UNION ALL
SELECT 
    'Total columnas',
    COUNT(*)::text
FROM information_schema.columns
WHERE table_schema = 'public'
UNION ALL
SELECT
    'Campos en coaches',
    COUNT(*)::text || CASE 
        WHEN COUNT(*) = 15 THEN ' ✅'
        ELSE ' ⚠️'
    END
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'coaches'
UNION ALL
SELECT
    'Campos en coach_team_season',
    COUNT(*)::text || CASE 
        WHEN COUNT(*) = 8 THEN ' ✅'
        ELSE ' ⚠️'
    END
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'coach_team_season';

