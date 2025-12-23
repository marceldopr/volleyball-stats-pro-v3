-- =====================================================
-- VERIFY coach_team_assignments TABLE SCHEMA
-- =====================================================
-- Check all constraints and structure
-- =====================================================

-- 1. Check all foreign keys
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name='coach_team_assignments'
ORDER BY kcu.column_name;

-- 2. Check all columns
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'coach_team_assignments'
ORDER BY ordinal_position;

-- 3. Check all constraints (including unique, check, etc.)
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'coach_team_assignments'::regclass
ORDER BY contype, conname;
