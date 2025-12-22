-- =====================================================
-- MIGRACIÓ DE SISTEMA ANTIC A NOU
-- =====================================================
-- Migra coaches i assignacions del sistema antic:
-- - coach_team_assignments → coach_team_season
-- - profiles amb assignacions → coaches
-- =====================================================

-- PASO 1: Crear registres a la taula coaches per tots els profiles que tenen assignacions
-- (inclou DTs que també són entrenadors)
INSERT INTO coaches (club_id, profile_id, first_name, last_name, email, status, approval_status)
SELECT DISTINCT
  p.club_id,
  p.id as profile_id,
  SPLIT_PART(p.full_name, ' ', 1) as first_name,
  SUBSTRING(p.full_name FROM POSITION(' ' IN p.full_name) + 1) as last_name,
  au.email,
  'active' as status,
  'approved' as approval_status
FROM profiles p
INNER JOIN coach_team_assignments cta ON cta.user_id = p.id
LEFT JOIN auth.users au ON au.id = p.id
WHERE NOT EXISTS (
  SELECT 1 FROM coaches c WHERE c.profile_id = p.id
);

-- PASO 2: Migrar assignacions de coach_team_assignments a coach_team_season
INSERT INTO coach_team_season (coach_id, team_id, season_id, role_in_team, created_at)
SELECT DISTINCT
  c.id as coach_id,
  cta.team_id,
  cta.season_id,
  'head' as role_in_team, -- Per defecte, pots canviar-ho després si cal
  cta.created_at
FROM coach_team_assignments cta
INNER JOIN coaches c ON c.profile_id = cta.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM coach_team_season cts 
  WHERE cts.coach_id = c.id 
  AND cts.team_id = cta.team_id 
  AND cts.season_id = cta.season_id
);

-- VERIFICACIÓ: Comptar quants coaches s'han migrat
SELECT 
  'Coaches migrats' as descripcion,
  COUNT(*) as total
FROM coaches
WHERE approval_status = 'approved'
UNION ALL
SELECT 
  'Assignacions migrades' as descripcion,
  COUNT(*) as total
FROM coach_team_season;
