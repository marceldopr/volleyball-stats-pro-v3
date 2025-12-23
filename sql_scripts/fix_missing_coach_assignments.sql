-- =====================================================
-- FIX: COMPLETAR MIGRACIÓN DE ENTRENADORES FALTANTES
-- =====================================================
-- Este script busca asignaciones en el sistema antiguo que no existen en el nuevo y las crea.

BEGIN;

-- 1. Crear coaches faltantes (si existen en assignments pero no en tabla coaches)
INSERT INTO coaches (club_id, profile_id, first_name, last_name, status, created_at)
SELECT DISTINCT
  p.club_id,
  cta.user_id as profile_id,
  COALESCE(SPLIT_PART(p.full_name, ' ', 1), 'Coach') as first_name,
  COALESCE(
    NULLIF(
      TRIM(SUBSTRING(p.full_name FROM POSITION(' ' IN p.full_name) + 1)),
      ''
    ),
    'Sin Apellido'
  ) as last_name,
  'active' as status,
  MIN(cta.created_at) as created_at
FROM coach_team_assignments cta
JOIN profiles p ON cta.user_id = p.id
WHERE NOT EXISTS (
  SELECT 1 FROM coaches c WHERE c.profile_id = cta.user_id
)
GROUP BY p.club_id, cta.user_id, p.full_name;

-- 2. Crear asignaciones faltantes en coach_team_season
INSERT INTO coach_team_season (coach_id, team_id, season_id, role_in_team, created_at)
SELECT 
  c.id as coach_id,
  cta.team_id,
  cta.season_id,
  COALESCE(cta.role_in_team, 'head') as role_in_team,
  cta.created_at
FROM coach_team_assignments cta
JOIN coaches c ON c.profile_id = cta.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM coach_team_season cts 
  WHERE cts.coach_id = c.id 
  AND cts.team_id = cta.team_id 
  AND cts.season_id = cta.season_id
);

-- 3. Verificación final
SELECT 
  COUNT(*) as asignaciones_recuperadas
FROM coach_team_season
WHERE created_at >= NOW() - INTERVAL '1 minute';

COMMIT;

-- Mensaje de éxito
SELECT 'Migración completada. Verifica la página de Gestion de Equipos.' as mensaje;
