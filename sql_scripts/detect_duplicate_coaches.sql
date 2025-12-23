-- Verificar si hay equipos con múltiples entrenadores en la misma temporada
SELECT 
    t.custom_name as team_name,
    t.category,
    t.gender,
    COUNT(cts.id) as num_coaches
FROM 
    coach_team_season cts
JOIN 
    teams t ON cts.team_id = t.id
WHERE 
    cts.season_id = (SELECT id FROM seasons WHERE is_current = true LIMIT 1)
GROUP BY 
    t.id, t.custom_name, t.category, t.gender
HAVING 
    COUNT(cts.id) > 1;

-- Listar los entrenadores de esos equipos duplicados
SELECT 
    t.custom_name,
    c.first_name,
    c.last_name,
    cts.role_in_team,
    cts.created_at
FROM 
    coach_team_season cts
JOIN 
    teams t ON cts.team_id = t.id
JOIN 
    coaches c ON cts.coach_id = c.id
WHERE 
    cts.team_id IN (
        SELECT team_id 
        FROM coach_team_season 
        WHERE season_id = (SELECT id FROM seasons WHERE is_current = true LIMIT 1)
        GROUP BY team_id 
        HAVING COUNT(id) > 1
    )
ORDER BY 
    t.custom_name, cts.created_at DESC;
