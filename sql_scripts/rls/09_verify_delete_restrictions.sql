-- =====================================================
-- RLS VERIFICATION: Test DELETE Restrictions
-- =====================================================
-- Purpose: Verify that only DT/Owner can DELETE, not coaches
-- =====================================================

-- =====================================================
-- SETUP: Create test data (run this once)
-- =====================================================

-- Note: You need to have:
-- 1. A test club
-- 2. A DT user in that club
-- 3. A coach user in that club
-- 4. Some test data to delete

-- =====================================================
-- TEST 1: Verify policies exist
-- =====================================================
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND cmd = 'DELETE'
  AND tablename IN (
    'club_players', 'teams', 'seasons', 'matches', 
    'match_convocations', 'match_player_set_stats',
    'trainings', 'training_attendance',
    'player_reports', 'reports', 'coach_reports',
    'player_guardians', 'player_injuries', 'player_measurements', 'player_documents'
  )
ORDER BY tablename;

-- Expected: 15 rows, all policies should start with "Only DT/Owner"

-- =====================================================
-- TEST 2: Check user roles
-- =====================================================
-- Verify you have both DT and coach users
SELECT 
  id, 
  full_name, 
  role, 
  club_id
FROM profiles
WHERE club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
ORDER BY role, full_name;

-- You should see at least one 'dt' and one 'coach'

-- =====================================================
-- TEST 3: Attempt DELETE as COACH (should FAIL)
-- =====================================================

-- IMPORTANT: Log in as a COACH user first!
-- Then try to delete a test player:

-- Step 1: Find a test player in your club
SELECT id, first_name, last_name, club_id 
FROM club_players 
WHERE club_id = public.get_user_club_id()
LIMIT 1;

-- Step 2: Try to DELETE (this should FAIL with RLS error)
-- Replace 'test-player-id' with actual ID from step 1
/*
DELETE FROM club_players 
WHERE id = 'test-player-id';
*/

-- Expected result: ERROR - new row violates row-level security policy
-- Or: 0 rows affected (RLS blocked it silently)

-- =====================================================
-- TEST 4: Attempt DELETE as DT (should SUCCEED)
-- =====================================================

-- IMPORTANT: Log in as a DT user first!
-- Then try to delete the same test player:

-- Step 1: Verify you are DT
SELECT role FROM profiles WHERE id = auth.uid();
-- Should return: 'dt'

-- Step 2: Find a test player
SELECT id, first_name, last_name, club_id 
FROM club_players 
WHERE club_id = public.get_user_club_id()
LIMIT 1;

-- Step 3: Try to DELETE (this should SUCCEED)
-- Replace 'test-player-id' with actual ID
/*
DELETE FROM club_players 
WHERE id = 'test-player-id';
*/

-- Expected result: 1 row deleted successfully

-- =====================================================
-- TEST 5: Test with other critical tables
-- =====================================================

-- As COACH (should FAIL):
/*
DELETE FROM teams WHERE id = 'test-team-id';
DELETE FROM seasons WHERE id = 'test-season-id';
DELETE FROM matches WHERE id = 'test-match-id';
*/

-- As DT (should SUCCEED):
/*
DELETE FROM teams WHERE id = 'test-team-id';
DELETE FROM seasons WHERE id = 'test-season-id';
DELETE FROM matches WHERE id = 'test-match-id';
*/

-- =====================================================
-- CLEANUP: Remove test data if you created any
-- =====================================================
-- Only run this if you created test data specifically for testing
-- and want to clean it up

-- (Add your cleanup queries here if needed)

-- =====================================================
-- SUMMARY
-- =====================================================
/*
✅ CORRECT BEHAVIOR:
1. Coach tries DELETE → BLOCKED by RLS
2. DT tries DELETE → ALLOWED by RLS

❌ INCORRECT BEHAVIOR (needs fixing):
1. Coach can DELETE → Policy is too permissive
2. DT cannot DELETE → Policy is too restrictive

If tests pass, your DELETE policies are correctly configured! 🎉
*/
