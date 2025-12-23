-- Verificar asignaciones del coach "TESTNombre TESTNombre"

-- 1. Buscar el coach por nombre
SELECT 
    id,
    first_name,
    last_name,
    profile_id,
    status
FROM coaches
WHERE first_name LIKE '%TEST%'
ORDER BY created_at DESC;

-- 2. Ver asignaciones en la tabla NUEVA (coach_team_season)
SELECT 
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
ORDER BY cts.created_at DESC;

-- 3. Ver asignaciones en la tabla ANTIGUA (coach_team_assignments)
SELECT 
    cta.id,
    p.full_name as coach_name,
    t.custom_name as team_name,
    t.category_stage,
    t.gender,
    s.name as season_name,
    cta.role_in_team,
    cta.created_at
FROM coach_team_assignments cta
JOIN profiles p ON cta.user_id = p.id
JOIN teams t ON cta.team_id = t.id
JOIN seasons s ON cta.season_id = s.id
WHERE p.full_name LIKE '%TEST%'
ORDER BY cta.created_at DESC;
