-- Script para verificar y eliminar la tabla 'players' duplicada
-- Ejecuta este script paso a paso en el editor SQL de Supabase

-- ========================================
-- PASO 1: VERIFICACIÓN
-- ========================================

-- 1.1 Verificar cuántas jugadoras hay en club_players (debe tener datos)
SELECT 
    'club_players' as tabla,
    COUNT(*) as total_registros
FROM public.club_players;

-- 1.2 Verificar cuántas jugadoras hay en players (debería estar vacía o con pocos datos)
SELECT 
    'players' as tabla,
    COUNT(*) as total_registros
FROM public.players;

-- 1.3 Comparar las estructuras de ambas tablas
SELECT 
    'club_players' as tabla,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'club_players' 
ORDER BY ordinal_position;

SELECT 
    'players' as tabla,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'players' 
ORDER BY ordinal_position;

-- ========================================
-- PASO 2: VERIFICAR DEPENDENCIAS
-- ========================================

-- 2.1 Verificar si hay foreign keys que apunten a 'players'
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.table_name = 'players';

-- ========================================
-- PASO 3: ELIMINACIÓN (Solo si PASO 1 y 2 son correctos)
-- ========================================

-- IMPORTANTE: Solo ejecuta esto si:
-- - club_players tiene todos los datos
-- - players está vacía o tiene datos obsoletos
-- - No hay foreign keys importantes apuntando a players

-- Descomentar la siguiente línea para eliminar la tabla:
-- DROP TABLE IF EXISTS public.players CASCADE;

-- ========================================
-- PASO 4: VERIFICACIÓN FINAL
-- ========================================

-- Verificar que la tabla players ya no existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name = 'players';

-- Si el resultado está vacío, la tabla se eliminó correctamente
