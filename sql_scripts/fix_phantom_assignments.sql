-- =====================================================
-- SOLUCIÓN: Limpiar asignaciones fantasma
-- =====================================================
-- Este script encuentra y opcionalmente elimina asignaciones
-- que existen en la BD pero no se muestran en la UI
-- =====================================================

-- 1. Ver TODAS las asignaciones del coach TESTNombre
SELECT 
    'coach_team_season (NUEVA)' as tabla,
    cts.id,
    c.first_name || ' ' || c.last_name as coach_name,
    t.custom_name as team_name,
    t.category_stage,
    t.gender,
    s.name as season_name,
    cts.role_in_team,
    cts.created_at
FROM coach_team_season cts
JOIN coaches c ON cts.coach_id = c.id
JOIN teams t ON cts.team_id = t.id
JOIN seasons s ON cts.season_id = s.id
WHERE c.first_name LIKE '%TEST%'
   OR c.last_name LIKE '%TEST%'
ORDER BY cts.created_at DESC;

-- 2. OPCIONAL: Eliminar TODAS las asignaciones del coach de test
-- ⚠️ DESCOMENTAR SOLO SI QUIERES BORRAR LAS ASIGNACIONES
/*
DELETE FROM coach_team_season
WHERE coach_id IN (
    SELECT id FROM coaches 
    WHERE first_name LIKE '%TEST%' 
       OR last_name LIKE '%TEST%'
);
*/

-- 3. Ver el coach_id del entrenador TEST
SELECT 
    id as coach_id,
    first_name,
    last_name,
    profile_id,
    status
FROM coaches
WHERE first_name LIKE '%TEST%'
   OR last_name LIKE '%TEST%';
