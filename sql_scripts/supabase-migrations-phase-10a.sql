-- ========================================
-- FASE 10A: MULTI-ROL SYSTEM - MIGRACIONES SQL
-- ========================================
-- Ejecutar estos scripts en Supabase SQL Editor
-- ========================================

-- ========================================
-- MIGRACIÓN 1: Actualizar valores de roles existentes
-- ========================================
-- EJECUTAR PRIMERO
-- Este script actualiza los roles existentes de Catalan/Spanish a English

-- Paso 1: Eliminar el constraint antiguo que valida los roles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Paso 2: Actualizar los valores de roles
UPDATE profiles 
SET role = CASE 
    WHEN role = 'director_tecnic' THEN 'dt'
    WHEN role = 'entrenador' THEN 'coach'
    WHEN role = 'admin' THEN 'admin'
    ELSE role
END
WHERE role IN ('director_tecnic', 'entrenador', 'admin');

-- Paso 3: Añadir nuevo constraint con los valores actualizados
ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('dt', 'coach', 'admin'));

-- Verificar la actualización
SELECT role, COUNT(*) as count 
FROM profiles 
GROUP BY role;

-- ========================================
-- MIGRACIÓN 2: Crear tabla coach_team_assignments
-- ========================================
-- EJECUTAR SEGUNDO
-- Esta tabla gestiona las asignaciones de entrenadores a equipos

CREATE TABLE IF NOT EXISTS coach_team_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    role_in_team TEXT NULL, -- 'head', 'assistant', etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Prevent duplicate assignments
    UNIQUE(user_id, team_id, season_id)
);

-- Add indexes for faster queries
CREATE INDEX idx_coach_assignments_user ON coach_team_assignments(user_id);
CREATE INDEX idx_coach_assignments_team ON coach_team_assignments(team_id);
CREATE INDEX idx_coach_assignments_season ON coach_team_assignments(season_id);

-- Enable RLS
ALTER TABLE coach_team_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can see their own assignments
CREATE POLICY "Users can view their own assignments"
    ON coach_team_assignments FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Admins/DT can see all assignments
CREATE POLICY "Admins can view all assignments"
    ON coach_team_assignments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'dt')
        )
    );

-- RLS Policy: Admins/DT can insert assignments
CREATE POLICY "Admins can create assignments"
    ON coach_team_assignments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'dt')
        )
    );

-- RLS Policy: Admins/DT can update assignments
CREATE POLICY "Admins can update assignments"
    ON coach_team_assignments FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'dt')
        )
    );

-- RLS Policy: Admins/DT can delete assignments
CREATE POLICY "Admins can delete assignments"
    ON coach_team_assignments FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'dt')
        )
    );

-- ========================================
-- EJEMPLO: Asignar un entrenador a un equipo
-- ========================================
-- Descomenta y modifica estos comandos para crear asignaciones de prueba

/*
-- Obtener IDs necesarios
SELECT id, full_name, role FROM profiles WHERE role = 'coach';
SELECT id, name FROM teams;
SELECT id, name FROM seasons WHERE is_current = true;

-- Crear asignación (reemplaza los UUIDs con los valores reales)
INSERT INTO coach_team_assignments (user_id, team_id, season_id, role_in_team)
VALUES (
    'UUID-DEL-COACH',
    'UUID-DEL-EQUIPO',
    'UUID-DE-LA-TEMPORADA',
    'head' -- o 'assistant', etc.
);
*/

-- ========================================
-- VERIFICACIÓN
-- ========================================
-- Ejecutar estos queries para verificar que todo funciona

-- Ver todas las asignaciones
SELECT 
    cta.id,
    p.full_name as coach_name,
    t.name as team_name,
    s.name as season_name,
    cta.role_in_team,
    cta.created_at
FROM coach_team_assignments cta
JOIN profiles p ON p.id = cta.user_id
JOIN teams t ON t.id = cta.team_id
JOIN seasons s ON s.id = cta.season_id
ORDER BY cta.created_at DESC;

-- Ver equipos asignados a un entrenador específico
/*
SELECT 
    t.id,
    t.name,
    s.name as season
FROM coach_team_assignments cta
JOIN teams t ON t.id = cta.team_id
JOIN seasons s ON s.id = cta.season_id
WHERE cta.user_id = 'UUID-DEL-COACH'
AND s.is_current = true;
*/
