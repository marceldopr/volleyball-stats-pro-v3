-- =====================================================
-- ADD user_id FOREIGN KEY CONSTRAINT
-- =====================================================
-- The previous DO block didn't add it, so we'll do it directly
-- =====================================================

-- Add the user_id foreign key constraint
ALTER TABLE coach_team_assignments 
ADD CONSTRAINT coach_team_assignments_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Verify it was added
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
