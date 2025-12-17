-- ========================================
-- SCHEMA EXPORT COMPLET - Supabase
-- ========================================
-- Executa aquest script a Supabase SQL Editor
-- i envia'm el resultat complet
-- Això em donarà tota la informació necessària per treballar
-- ========================================

-- 1. LLISTAT DE TOTES LES TAULES
SELECT 
    '=== TAULES ===' as section,
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as num_columns
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. ESTRUCTURA COMPLETA DE CADA TAULA (COLUMNES)
SELECT 
    '=== COLUMNES ===' as section,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 3. FOREIGN KEYS (RELACIONS)
SELECT
    '=== FOREIGN KEYS ===' as section,
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
ORDER BY tc.table_name, kcu.column_name;

-- 4. ÍNDEXS
SELECT
    '=== INDEXES ===' as section,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ========================================
-- ALTERNATIVA SIMPLIFICADA (MÉS FÀCIL DE LLEGIR)
-- ========================================
-- Si l'anterior és massa, executa només aquest:

SELECT 
    table_name as "Taula",
    column_name as "Camp",
    data_type as "Tipus",
    CASE WHEN is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END as "Nullable"
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
