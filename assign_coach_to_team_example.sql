-- ========================================
-- EJEMPLO: ASIGNAR ENTRENADOR A EQUIPO
-- ========================================
-- Script de ejemplo para asignar manualmente un entrenador a un equipo
-- Útil para testing o cuando la UI no está disponible

-- PASO 1: Obtener ID del entrenador
-- Ejecuta esta query y copia el ID del entrenador que quieres asignar
SELECT 
    id, 
    full_name, 
    club_id 
FROM profiles 
WHERE role = 'coach'
ORDER BY full_name;

-- PASO 2: Obtener ID del equipo
-- Ejecuta esta query y copia el ID del equipo al que quieres asignar el entrenador
SELECT 
    id, 
    name, 
    category_stage,
    season_id
FROM teams
ORDER BY name;

-- PASO 3: Obtener ID de la temporada actual
-- Ejecuta esta query y copia el ID de la temporada activa
SELECT 
    id, 
    name,
    is_current
FROM seasons 
WHERE is_current = true
LIMIT 1;

-- PASO 4: Crear la asignación
-- IMPORTANTE: Reemplaza los UUIDs con los valores reales obtenidos arriba
INSERT INTO coach_team_assignments (user_id, team_id, season_id, role_in_team)
VALUES (
    'UUID-DEL-ENTRENADOR',  -- Reemplazar con el ID del PASO 1
    'UUID-DEL-EQUIPO',       -- Reemplazar con el ID del PASO 2
    'UUID-DE-LA-TEMPORADA',  -- Reemplazar con el ID del PASO 3
    'head'                   -- Opciones: 'head' (principal) o 'assistant' (asistente)
);

-- PASO 5: Verificar que la asignación se creó correctamente
-- Reemplaza UUID-DEL-ENTRENADOR con el ID usado en el PASO 4
SELECT 
    p.full_name as entrenador,
    t.name as equipo,
    t.category_stage,
    s.name as temporada,
    cta.role_in_team as rol,
    cta.created_at
FROM coach_team_assignments cta
JOIN profiles p ON p.id = cta.user_id
JOIN teams t ON t.id = cta.team_id
JOIN seasons s ON s.id = cta.season_id
WHERE cta.user_id = 'UUID-DEL-ENTRENADOR'
ORDER BY cta.created_at DESC;

-- ========================================
-- EJEMPLO COMPLETO (con valores de ejemplo)
-- ========================================
-- Descomenta y modifica este bloque para una asignación rápida

/*
-- Asignar entrenador "Juan Pérez" al equipo "Juvenil Femenino" en temporada 2024/2025
INSERT INTO coach_team_assignments (user_id, team_id, season_id, role_in_team)
VALUES (
    '123e4567-e89b-12d3-a456-426614174000',  -- ID de Juan Pérez
    '987fcdeb-51a2-43f1-b9c3-987654321000',  -- ID de Juvenil Femenino
    'abcdef12-3456-7890-abcd-ef1234567890',  -- ID de temporada 2024/2025
    'head'
);
*/

-- ========================================
-- ELIMINAR UNA ASIGNACIÓN (si es necesario)
-- ========================================
-- Descomenta y modifica para eliminar una asignación incorrecta

/*
DELETE FROM coach_team_assignments
WHERE id = 'UUID-DE-LA-ASIGNACION';
*/
