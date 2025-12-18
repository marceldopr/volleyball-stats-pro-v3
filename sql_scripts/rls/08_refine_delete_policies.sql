-- =====================================================
-- RLS SECURITY: Refine DELETE Policies (DT/Owner Only)
-- =====================================================
-- Purpose: Restrict DELETE operations on critical tables to only DT and Owner roles
-- This prevents coaches from accidentally deleting important data
-- =====================================================

-- =====================================================
-- STEP 1: Drop all existing DELETE policies
-- =====================================================

-- Tables with direct club_id
DROP POLICY IF EXISTS "Users can delete own club players" ON club_players;
DROP POLICY IF EXISTS "Users can delete own club teams" ON teams;
DROP POLICY IF EXISTS "Users can delete own club seasons" ON seasons;
DROP POLICY IF EXISTS "Users can delete own club matches" ON matches;
DROP POLICY IF EXISTS "Users can delete own club player reports" ON player_reports;
DROP POLICY IF EXISTS "Users can delete own club reports" ON reports;
DROP POLICY IF EXISTS "Users can delete own club coach reports" ON coach_reports;

-- Tables with FK via team_id
DROP POLICY IF EXISTS "Users can delete own club match convocations" ON match_convocations;
DROP POLICY IF EXISTS "Users can delete own club trainings" ON trainings;

-- Tables with FK via match_id
DROP POLICY IF EXISTS "Users can delete own club match player set stats" ON match_player_set_stats;

-- Tables with FK via training_id (nested)
DROP POLICY IF EXISTS "Users can delete own club training attendance" ON training_attendance;

-- Tables with FK via player_id
DROP POLICY IF EXISTS "Users can delete own club player guardians" ON player_guardians;
DROP POLICY IF EXISTS "Users can delete own club player injuries" ON player_injuries;
DROP POLICY IF EXISTS "Users can delete own club player measurements" ON player_measurements;
DROP POLICY IF EXISTS "Users can delete own club player documents" ON player_documents;

-- =====================================================
-- STEP 2: Create new DT/Owner-only DELETE policies
-- =====================================================

-- Helper: Check if user is DT or Owner
-- We'll use this pattern: (SELECT role FROM profiles WHERE id = auth.uid()) IN ('dt', 'owner')

-- -----------------------------------------------------
-- Pattern A: Tables with direct club_id
-- -----------------------------------------------------

-- club_players
CREATE POLICY "Only DT/Owner can delete players"
ON club_players FOR DELETE
TO authenticated
USING (
  club_id = public.get_user_club_id()
  AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('dt', 'owner')
);

-- teams
CREATE POLICY "Only DT/Owner can delete teams"
ON teams FOR DELETE
TO authenticated
USING (
  club_id = public.get_user_club_id()
  AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('dt', 'owner')
);

-- seasons
CREATE POLICY "Only DT/Owner can delete seasons"
ON seasons FOR DELETE
TO authenticated
USING (
  club_id = public.get_user_club_id()
  AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('dt', 'owner')
);

-- matches
CREATE POLICY "Only DT/Owner can delete matches"
ON matches FOR DELETE
TO authenticated
USING (
  club_id = public.get_user_club_id()
  AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('dt', 'owner')
);

-- player_reports
CREATE POLICY "Only DT/Owner can delete player reports"
ON player_reports FOR DELETE
TO authenticated
USING (
  club_id = public.get_user_club_id()
  AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('dt', 'owner')
);

-- reports
CREATE POLICY "Only DT/Owner can delete reports"
ON reports FOR DELETE
TO authenticated
USING (
  club_id = public.get_user_club_id()
  AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('dt', 'owner')
);

-- coach_reports
CREATE POLICY "Only DT/Owner can delete coach reports"
ON coach_reports FOR DELETE
TO authenticated
USING (
  club_id = public.get_user_club_id()
  AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('dt', 'owner')
);

-- -----------------------------------------------------
-- Pattern B: Tables with FK via team_id
-- -----------------------------------------------------

-- match_convocations
CREATE POLICY "Only DT/Owner can delete match convocations"
ON match_convocations FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = match_convocations.team_id
    AND teams.club_id = public.get_user_club_id()
  )
  AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('dt', 'owner')
);

-- trainings
CREATE POLICY "Only DT/Owner can delete trainings"
ON trainings FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = trainings.team_id
    AND teams.club_id = public.get_user_club_id()
  )
  AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('dt', 'owner')
);

-- -----------------------------------------------------
-- Pattern C: Tables with FK via match_id
-- -----------------------------------------------------

-- match_player_set_stats (via match_id -> matches -> club_id)
CREATE POLICY "Only DT/Owner can delete match player set stats"
ON match_player_set_stats FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = match_player_set_stats.match_id
    AND matches.club_id = public.get_user_club_id()
  )
  AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('dt', 'owner')
);

-- -----------------------------------------------------
-- Pattern D: Tables with nested FK via training_id -> trainings -> team_id
-- -----------------------------------------------------

-- training_attendance
CREATE POLICY "Only DT/Owner can delete training attendance"
ON training_attendance FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trainings
    JOIN teams ON teams.id = trainings.team_id
    WHERE trainings.id = training_attendance.training_id
    AND teams.club_id = public.get_user_club_id()
  )
  AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('dt', 'owner')
);

-- -----------------------------------------------------
-- Pattern E: Tables with FK via player_id
-- -----------------------------------------------------

-- player_guardians
CREATE POLICY "Only DT/Owner can delete player guardians"
ON player_guardians FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM club_players
    WHERE club_players.id = player_guardians.player_id
    AND club_players.club_id = public.get_user_club_id()
  )
  AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('dt', 'owner')
);

-- player_injuries
CREATE POLICY "Only DT/Owner can delete player injuries"
ON player_injuries FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM club_players
    WHERE club_players.id = player_injuries.player_id
    AND club_players.club_id = public.get_user_club_id()
  )
  AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('dt', 'owner')
);

-- player_measurements
CREATE POLICY "Only DT/Owner can delete player measurements"
ON player_measurements FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM club_players
    WHERE club_players.id = player_measurements.player_id
    AND club_players.club_id = public.get_user_club_id()
  )
  AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('dt', 'owner')
);

-- player_documents
CREATE POLICY "Only DT/Owner can delete player documents"
ON player_documents FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM club_players
    WHERE club_players.id = player_documents.player_id
    AND club_players.club_id = public.get_user_club_id()
  )
  AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('dt', 'owner')
);

-- =====================================================
-- VERIFICATION: List all DELETE policies
-- =====================================================
SELECT 
  schemaname,
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
ORDER BY tablename, policyname;

-- Expected result: 15 policies, all named "Only DT/Owner can delete..."
