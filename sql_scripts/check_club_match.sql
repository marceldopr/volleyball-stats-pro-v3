-- VERIFICAR COINCIDENCIA DE CLUB_ID
-- La política RLS de 'teams' requiere que el usuario pertenezca al mismo club que el equipo.

SELECT 
    p.full_name as coach_name,
    p.club_id as coach_club_id,
    t.name as team_name,
    t.club_id as team_club_id,
    CASE WHEN p.club_id = t.club_id THEN 'MATCH ✅' ELSE 'MISMATCH ❌' END as status
FROM coach_team_assignments cta
JOIN profiles p ON p.id = cta.user_id
JOIN teams t ON t.id = cta.team_id
WHERE p.full_name = 'Nombre test1';
