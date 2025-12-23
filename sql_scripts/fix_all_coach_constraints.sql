-- =====================================================
-- FIX ALL COACH_TEAM_ASSIGNMENTS CONSTRAINTS
-- =====================================================
-- Remove all incorrect foreign key constraints and ensure
-- only the correct ones exist
-- =====================================================

-- 1. Drop ALL existing foreign key constraints on user_id
ALTER TABLE coach_team_assignments 
DROP CONSTRAINT IF EXISTS coach_team_assignments_user_fkey;

ALTER TABLE coach_team_assignments 
DROP CONSTRAINT IF EXISTS coach_team_assignments_coach_id_fkey;

-- 2. Verify the correct user_id constraint exists
-- (It should already exist based on previous verification)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'coach_team_assignments_user_id_fkey'
        AND table_name = 'coach_team_assignments'
    ) THEN
        ALTER TABLE coach_team_assignments 
        ADD CONSTRAINT coach_team_assignments_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Verify all constraints are correct
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_schema || '.' || ccu.table_name AS foreign_table,
    ccu.column_name AS foreign_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name='coach_team_assignments'
ORDER BY kcu.column_name;
