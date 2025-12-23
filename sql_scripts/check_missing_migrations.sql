-- Verificación de migración de entrenadores
-- Este script lista los equipos que tienen asignación en la tabla ANTIGUA pero NO en la tabla NUEVA

WITH OldAssignments AS (
    SELECT 
        cta.team_id,
        cta.user_id as profile_id, -- En tabla antigua se llamaba user_id o coach_id? user_id según esquema
        cta.season_id,
        cta.role_in_team
    FROM 
        coach_team_assignments cta
),
NewAssignments AS (
    SELECT 
        cts.team_id,
        cts.coach_id,
        c.profile_id,
        cts.season_id,
        cts.role_in_team
    FROM 
        coach_team_season cts
    JOIN 
        coaches c ON cts.coach_id = c.id
)

SELECT 
    t.custom_name as team_name,
    t.category,
    t.id as team_id,
    oa.profile_id as old_profile_id,
    oa.role_in_team as old_role
FROM 
    OldAssignments oa
JOIN 
    teams t ON oa.team_id = t.id
LEFT JOIN 
    NewAssignments na ON oa.team_id = na.team_id AND oa.season_id = na.season_id
WHERE 
    na.team_id IS NULL -- No existe asignación nueva para esta temporada/equipo
    AND oa.season_id = (SELECT id FROM seasons WHERE is_current = true LIMIT 1); -- Solo temporada actual

-- Si salen resultados, significa que faltan migraciones para esos equipos.
