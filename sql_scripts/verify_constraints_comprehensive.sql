-- =====================================================
-- COMPREHENSIVE CONSTRAINT VERIFICATION
-- =====================================================
-- Use pg_constraint directly to see ALL constraints
-- =====================================================

-- Method 1: Direct from pg_constraint (most reliable)
SELECT
    conname AS constraint_name,
    contype AS type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'coach_team_assignments'::regclass
ORDER BY contype, conname;

-- Method 2: Check specifically for user_id constraint
SELECT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conrelid = 'coach_team_assignments'::regclass
    AND conname = 'coach_team_assignments_user_id_fkey'
) AS user_id_fkey_exists;

-- Method 3: Show just foreign keys with their target tables
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'coach_team_assignments'::regclass
AND contype = 'f'
ORDER BY conname;
