-- =====================================================
-- RLS SECURITY: Step 6 - Verification and Testing Queries
-- =====================================================
-- Purpose: Test queries to verify RLS policies are working correctly
-- and that multi-tenant isolation is properly enforced
-- =====================================================

-- =====================================================
-- STEP 1: Verify RLS is Enabled
-- =====================================================
-- This query should show rowsecurity = true for all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;


-- =====================================================
-- STEP 2: List All RLS Policies
-- =====================================================
-- This query shows all policies created on public tables
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,  -- should be 'PERMISSIVE'
  roles,       -- should include 'authenticated'
  cmd,         -- SELECT, INSERT, UPDATE, DELETE, or ALL
  qual,        -- USING clause
  with_check   -- WITH CHECK clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;


-- =====================================================
-- STEP 3: Count Policies Per Table
-- =====================================================
-- Most tables should have 4 policies (SELECT, INSERT, UPDATE, DELETE)
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY policy_count DESC, tablename;


-- =====================================================
-- STEP 4: Test Club Isolation (Manual Test)
-- =====================================================
-- You need to execute these queries while authenticated as different users

-- 4A. Create test data for two different clubs
-- Run this as Supabase admin (service role)
/*
-- Insert test clubs
INSERT INTO clubs (id, name, acronym) VALUES
  ('club-test-a', 'Test Club A', 'TCA'),
  ('club-test-b', 'Test Club B', 'TCB')
ON CONFLICT (id) DO NOTHING;

-- Insert test users (profiles)
INSERT INTO profiles (id, club_id, full_name, role) VALUES
  ('user-test-a', 'club-test-a', 'User from Club A', 'coach'),
  ('user-test-b', 'club-test-b', 'User from Club B', 'coach')
ON CONFLICT (id) DO NOTHING;

-- Insert test seasons
INSERT INTO seasons (id, club_id, name, reference_date, is_current) VALUES
  ('season-a', 'club-test-a', 'Season 2024-2025 Club A', '2024-09-01', true),
  ('season-b', 'club-test-b', 'Season 2024-2025 Club B', '2024-09-01', true)
ON CONFLICT (id) DO NOTHING;

-- Insert test teams
INSERT INTO teams (id, club_id, category_stage, gender, season_id) VALUES
  ('team-a', 'club-test-a', 'Senior', 'female', 'season-a'),
  ('team-b', 'club-test-b', 'Senior', 'male', 'season-b')
ON CONFLICT (id) DO NOTHING;

-- Insert test players
INSERT INTO club_players (id, club_id, first_name, last_name, birth_date, gender) VALUES
  ('player-a', 'club-test-a', 'Player', 'Club A', '2000-01-01', 'female'),
  ('player-b', 'club-test-b', 'Player', 'Club B', '2000-01-01', 'male')
ON CONFLICT (id) DO NOTHING;
*/

-- 4B. Test as user-test-a (should only see club-test-a data)
-- Set auth.uid() to 'user-test-a' via Supabase client or SQL
/*
-- These queries should return ONLY club-test-a data:
SELECT * FROM clubs;       -- Should see only 'Test Club A'
SELECT * FROM seasons;     -- Should see only season-a
SELECT * FROM teams;       -- Should see only team-a
SELECT * FROM club_players;-- Should see only player-a
*/

-- 4C. Test as user-test-b (should only see club-test-b data)
-- Set auth.uid() to 'user-test-b' via Supabase client or SQL
/*
-- These queries should return ONLY club-test-b data:
SELECT * FROM clubs;       -- Should see only 'Test Club B'
SELECT * FROM seasons;     -- Should see only season-b
SELECT * FROM teams;       -- Should see only team-b
SELECT * FROM club_players;-- Should see only player-b
*/


-- =====================================================
-- STEP 5: Test INSERT Isolation
-- =====================================================
-- Try to insert data into another club (should fail)

-- As user-test-a, try to insert a team into club-test-b
/*
INSERT INTO teams (id, club_id, category_stage, gender, season_id)
VALUES ('team-hack', 'club-test-b', 'Junior', 'female', 'season-b');
-- Expected: ERROR - new row violates row-level security policy
*/


-- =====================================================
-- STEP 6: Test UPDATE Isolation
-- =====================================================
-- Try to update data from another club (should fail)

-- As user-test-a, try to update a team from club-test-b
/*
UPDATE teams SET category_stage = 'Hacked' WHERE id = 'team-b';
-- Expected: No rows updated (RLS blocks access)
-- Or ERROR if strict RLS is configured
*/


-- =====================================================
-- STEP 7: Test DELETE Isolation
-- =====================================================
-- Try to delete data from another club (should fail)

-- As user-test-a, try to delete a player from club-test-b
/*
DELETE FROM club_players WHERE id = 'player-b';
-- Expected: No rows deleted (RLS blocks access)
*/


-- =====================================================
-- STEP 8: Test FK-based Policies (Pattern B)
-- =====================================================
-- Test that access via FK relationships works correctly

-- As user-test-a, insert coach_team_assignment for own club (should succeed)
/*
INSERT INTO coach_team_assignments (user_id, team_id, season_id)
VALUES ('user-test-a', 'team-a', 'season-a');
-- Expected: Success
*/

-- As user-test-a, insert coach_team_assignment for other club (should fail)
/*
INSERT INTO coach_team_assignments (user_id, team_id, season_id)
VALUES ('user-test-a', 'team-b', 'season-b');
-- Expected: ERROR - new row violates row-level security policy
*/


-- =====================================================
-- STEP 9: Test Nested FK (training_attendance)
-- =====================================================
-- Create a training and test attendance access

-- As user-test-a, create training for team-a
/*
INSERT INTO trainings (id, team_id, date, title)
VALUES ('training-a', 'team-a', NOW(), 'Test Training');
*/

-- As user-test-a, insert attendance for this training (should succeed)
/*
INSERT INTO training_attendance (training_id, player_id, status)
VALUES ('training-a', 'player-a', 'present');
-- Expected: Success
*/

-- As user-test-b, try to view this attendance (should fail / return 0 rows)
/*
SELECT * FROM training_attendance WHERE training_id = 'training-a';
-- Expected: No rows returned
*/


-- =====================================================
-- STEP 10: Cleanup Test Data
-- =====================================================
-- Run this to remove test data after verification
/*
DELETE FROM training_attendance WHERE training_id = 'training-a';
DELETE FROM trainings WHERE id = 'training-a';
DELETE FROM coach_team_assignments WHERE user_id IN ('user-test-a', 'user-test-b');
DELETE FROM club_players WHERE id IN ('player-a', 'player-b');
DELETE FROM teams WHERE id IN ('team-a', 'team-b');
DELETE FROM seasons WHERE id IN ('season-a', 'season-b');
DELETE FROM profiles WHERE id IN ('user-test-a', 'user-test-b');
DELETE FROM clubs WHERE id IN ('club-test-a', 'club-test-b');
*/


-- =====================================================
-- EXPECTED RESULTS SUMMARY
-- =====================================================
/*
✅ All tables should have rowsecurity = true
✅ Each table should have 4 policies (SELECT, INSERT, UPDATE, DELETE)
   Exception: profiles may have 2 policies (SELECT, UPDATE only)
✅ User from club-test-a can ONLY see/modify club-test-a data
✅ User from club-test-b can ONLY see/modify club-test-b data
✅ Cross-club INSERT/UPDATE/DELETE should fail or return 0 affected rows
✅ FK-based policies should correctly cascade club_id checks
✅ Nested FK policies (e.g., training_attendance) should work correctly

❌ If any test fails, review the relevant policy in the corresponding SQL file
❌ If USING clause is too restrictive, users may be blocked from legitimate access
❌ If WITH CHECK is too permissive, users may be able to insert invalid data
*/
