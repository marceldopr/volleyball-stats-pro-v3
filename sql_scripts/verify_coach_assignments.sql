-- ========================================
-- VERIFICACIÓN DE ASIGNACIONES DE ENTRENADORES
-- ========================================
-- Ejecutar en Supabase SQL Editor para diagnosticar el problema

-- 1. Verificar entrenadores existentes
SELECT 
    id, 
    full_name, 
    role, 
    club_id,
    created_at
FROM profiles 
WHERE role = 'coach'
ORDER BY created_at DESC;

-- 2. Verificar equipos existentes
SELECT 
    id, 
    name, 
    club_id, 
    season_id,
    category_stage,
    created_at
FROM teams
ORDER BY created_at DESC;

-- 3. Verificar temporadas activas
SELECT 
    id, 
    name, 
    is_current, 
    club_id,
    start_date,
    end_date
FROM seasons 
WHERE is_current = true
ORDER BY start_date DESC;

-- 4. Verificar asignaciones existentes (coach_team_assignments)
SELECT 
    cta.id,
    p.full_name as coach_name,
    t.name as team_name,
    t.category_stage,
    s.name as season_name,
    cta.role_in_team,
    cta.created_at
FROM coach_team_assignments cta
JOIN profiles p ON p.id = cta.user_id
JOIN teams t ON t.id = cta.team_id
JOIN seasons s ON s.id = cta.season_id
ORDER BY cta.created_at DESC;

-- 5. Contar asignaciones por entrenador
SELECT 
    p.full_name as entrenador,
    COUNT(cta.id) as equipos_asignados
FROM profiles p
LEFT JOIN coach_team_assignments cta ON cta.user_id = p.id
WHERE p.role = 'coach'
GROUP BY p.id, p.full_name
ORDER BY equipos_asignados DESC;

-- 6. Verificar entrenadores SIN asignaciones
SELECT 
    p.id,
    p.full_name as entrenador_sin_equipos,
    p.club_id
FROM profiles p
LEFT JOIN coach_team_assignments cta ON cta.user_id = p.id
WHERE p.role = 'coach'
AND cta.id IS NULL;

-- 7. Verificar equipos SIN entrenador asignado
SELECT 
    t.id,
    t.name as equipo_sin_entrenador,
    t.category_stage,
    s.name as temporada
FROM teams t
JOIN seasons s ON s.id = t.season_id
LEFT JOIN coach_team_assignments cta ON cta.team_id = t.id
WHERE cta.id IS NULL
AND s.is_current = true;
