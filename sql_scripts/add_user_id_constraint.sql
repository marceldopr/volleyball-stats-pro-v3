-- =====================================================
-- ADD MISSING user_id FOREIGN KEY CONSTRAINT
-- =====================================================
-- Add the foreign key constraint from user_id to auth.users(id)
-- This was missing after removing the old coach_id constraint
-- =====================================================

-- Add the missing foreign key constraint
ALTER TABLE coach_team_assignments 
ADD CONSTRAINT coach_team_assignments_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Verify all foreign keys are now in place
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
