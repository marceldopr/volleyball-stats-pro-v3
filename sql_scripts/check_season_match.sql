-- VERIFICAR TEMPORADA ACTUAL Y ASIGNACIONES
-- Ejecuta esto para ver qué temporada está marcada como "current"

SELECT 
    id, 
    name, 
    is_current, 
    club_id,
    start_date,
    end_date
FROM seasons 
WHERE is_current = true;

-- Verificar si la asignación coincide con la temporada actual
SELECT 
    cta.id as assignment_id,
    p.full_name as coach,
    t.name as team,
    s.name as season_name,
    s.is_current as season_is_current
FROM coach_team_assignments cta
JOIN profiles p ON p.id = cta.user_id
JOIN teams t ON t.id = cta.team_id
JOIN seasons s ON s.id = cta.season_id
WHERE p.full_name = 'Nombre test1'; -- Reemplaza con el nombre real si es diferente
