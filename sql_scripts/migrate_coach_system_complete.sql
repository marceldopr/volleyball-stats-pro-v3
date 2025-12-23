-- =====================================================
-- MIGRACIÓN DE DATOS: coach_team_assignments → Nuevo Sistema
-- =====================================================
-- Este script migra los datos del sistema antiguo al nuevo
-- Paso 1: Crea las tablas si no existen
-- Paso 2: Migra los datos
-- Paso 3: Verifica la migración
-- =====================================================

-- IMPORTANTE: Ejecuta primero verify_coach_migration_status.sql
-- para ver el estado actual de tu base de datos

BEGIN;

-- =====================================================
-- PASO 1: CREAR TABLAS SI NO EXISTEN
-- =====================================================

-- Tabla coaches
CREATE TABLE IF NOT EXISTS coaches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  photo_url TEXT,
  phone TEXT,
  email TEXT,
  notes_internal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_coaches_club_id ON coaches(club_id);
CREATE INDEX IF NOT EXISTS idx_coaches_profile_id ON coaches(profile_id);
CREATE INDEX IF NOT EXISTS idx_coaches_status ON coaches(status);

-- Tabla coach_team_season
CREATE TABLE IF NOT EXISTS coach_team_season (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  role_in_team TEXT DEFAULT 'head' CHECK (role_in_team IN ('head', 'assistant', 'pf', 'other')),
  date_from DATE,
  date_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(coach_id, team_id, season_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_coach_team_season_coach_id ON coach_team_season(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_team_season_team_id ON coach_team_season(team_id);
CREATE INDEX IF NOT EXISTS idx_coach_team_season_season_id ON coach_team_season(season_id);

-- =====================================================
-- PASO 2: HABILITAR RLS
-- =====================================================

ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_team_season ENABLE ROW LEVEL SECURITY;

-- Políticas para coaches
DROP POLICY IF EXISTS "coaches_select_policy" ON coaches;
CREATE POLICY "coaches_select_policy" ON coaches
  FOR SELECT
  USING (
    club_id IN (
      SELECT club_id FROM profiles WHERE id = auth.uid()
    )
    AND (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('dt', 'director_tecnic', 'admin')
      )
      OR profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "coaches_insert_policy" ON coaches;
CREATE POLICY "coaches_insert_policy" ON coaches
  FOR INSERT
  WITH CHECK (
    club_id IN (
      SELECT club_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('dt', 'director_tecnic', 'admin')
    )
  );

DROP POLICY IF EXISTS "coaches_update_policy" ON coaches;
CREATE POLICY "coaches_update_policy" ON coaches
  FOR UPDATE
  USING (
    club_id IN (
      SELECT club_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('dt', 'director_tecnic', 'admin')
    )
  );

DROP POLICY IF EXISTS "coaches_delete_policy" ON coaches;
CREATE POLICY "coaches_delete_policy" ON coaches
  FOR DELETE
  USING (
    club_id IN (
      SELECT club_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('dt', 'director_tecnic', 'admin')
    )
  );

-- Políticas para coach_team_season
DROP POLICY IF EXISTS "coach_team_season_select_policy" ON coach_team_season;
CREATE POLICY "coach_team_season_select_policy" ON coach_team_season
  FOR SELECT
  USING (
    coach_id IN (
      SELECT c.id FROM coaches c
      JOIN profiles p ON c.club_id = p.club_id
      WHERE p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "coach_team_season_insert_policy" ON coach_team_season;
CREATE POLICY "coach_team_season_insert_policy" ON coach_team_season
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM coaches c
      JOIN profiles p ON c.club_id = p.club_id
      WHERE c.id = coach_id
      AND p.id = auth.uid()
      AND p.role IN ('dt', 'director_tecnic', 'admin')
    )
  );

DROP POLICY IF EXISTS "coach_team_season_update_policy" ON coach_team_season;
CREATE POLICY "coach_team_season_update_policy" ON coach_team_season
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM coaches c
      JOIN profiles p ON c.club_id = p.club_id
      WHERE c.id = coach_id
      AND p.id = auth.uid()
      AND p.role IN ('dt', 'director_tecnic', 'admin')
    )
  );

DROP POLICY IF EXISTS "coach_team_season_delete_policy" ON coach_team_season;
CREATE POLICY "coach_team_season_delete_policy" ON coach_team_season
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM coaches c
      JOIN profiles p ON c.club_id = p.club_id
      WHERE c.id = coach_id
      AND p.id = auth.uid()
      AND p.role IN ('dt', 'director_tecnic', 'admin')
    )
  );

-- =====================================================
-- PASO 3: MIGRAR DATOS
-- =====================================================

-- Crear coaches desde coach_team_assignments
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

-- Migrar asignaciones a coach_team_season
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
)
ON CONFLICT (coach_id, team_id, season_id) DO NOTHING;

-- =====================================================
-- PASO 4: VERIFICACIÓN
-- =====================================================

-- Ver resumen de la migración
SELECT 
  'Coaches creados' as descripcion,
  COUNT(*) as cantidad
FROM coaches

UNION ALL

SELECT 
  'Asignaciones migradas' as descripcion,
  COUNT(*) as cantidad
FROM coach_team_season

UNION ALL

SELECT 
  'Asignaciones originales' as descripcion,
  COUNT(*) as cantidad
FROM coach_team_assignments;

-- Ver comparación detallada
SELECT 
  'coach_team_assignments' as tabla,
  cta.id,
  p.full_name as coach_name,
  t.custom_name as team,
  s.name as season,
  cta.role_in_team
FROM coach_team_assignments cta
LEFT JOIN profiles p ON cta.user_id = p.id
LEFT JOIN teams t ON cta.team_id = t.id
LEFT JOIN seasons s ON cta.season_id = s.id
ORDER BY cta.created_at DESC
LIMIT 5;

SELECT 
  'coach_team_season' as tabla,
  cts.id,
  (c.first_name || ' ' || c.last_name) as coach_name,
  t.custom_name as team,
  s.name as season,
  cts.role_in_team
FROM coach_team_season cts
LEFT JOIN coaches c ON cts.coach_id = c.id
LEFT JOIN teams t ON cts.team_id = t.id
LEFT JOIN seasons s ON cts.season_id = s.id
ORDER BY cts.created_at DESC
LIMIT 5;

COMMIT;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
-- 1. Este script es IDEMPOTENTE - puede ejecutarse múltiples veces
-- 2. NO elimina la tabla coach_team_assignments (mantiene backup)
-- 3. Si ya existen registros en coaches, no los duplica
-- 4. Si ya existen asignaciones en coach_team_season, no las duplica
-- 5. Después de verificar que todo funciona, puedes eliminar coach_team_assignments
