-- =====================================================
-- RLS SECURITY: Allow Coach Delete Planned Matches
-- =====================================================
-- Purpose: Update DELETE policy on matches to allow coaches to delete
-- matches ONLY IF they are in 'planned' status (not started).
-- DT and Owner retain full delete permissions.
-- =====================================================

-- Drop the previous restrictive policy from 08_refine_delete_policies.sql
DROP POLICY IF EXISTS "Only DT/Owner can delete matches" ON matches;

-- Create the new more flexible policy
CREATE POLICY "DT/Owner always, Coach if planned"
ON matches FOR DELETE
TO authenticated
USING (
  -- 1. Base Security: Must belong to the same club
  club_id = public.get_user_club_id()
  AND (
    -- 2a. DT and Owner can delete ANY match
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('dt', 'owner')
    OR
    -- 2b. Coach can delete ONLY if match is planned
    (
       (SELECT role FROM profiles WHERE id = auth.uid()) = 'coach'
       AND
       status = 'planned'
    )
  )
);

-- Verification
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'matches' 
  AND cmd = 'DELETE';
