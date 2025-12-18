-- =====================================================
-- RLS CLEANUP: Drop All Existing Policies
-- =====================================================
-- Purpose: Remove all RLS policies to start fresh
-- Run this BEFORE re-executing the policy scripts
-- =====================================================

-- Core structure tables
DROP POLICY IF EXISTS "Users can view own club" ON clubs;
DROP POLICY IF EXISTS "Users can view own club categories" ON club_categories;
DROP POLICY IF EXISTS "Users can insert own club categories" ON club_categories;
DROP POLICY IF EXISTS "Users can update own club categories" ON club_categories;
DROP POLICY IF EXISTS "Users can delete own club categories" ON club_categories;
DROP POLICY IF EXISTS "Users can view own club identifiers" ON club_identifiers;
DROP POLICY IF EXISTS "Users can insert own club identifiers" ON club_identifiers;
DROP POLICY IF EXISTS "Users can update own club identifiers" ON club_identifiers;
DROP POLICY IF EXISTS "Users can delete own club identifiers" ON club_identifiers;
DROP POLICY IF EXISTS "Users can view own club players" ON club_players;
DROP POLICY IF EXISTS "Users can insert own club players" ON club_players;
DROP POLICY IF EXISTS "Users can update own club players" ON club_players;
DROP POLICY IF EXISTS "Users can delete own club players" ON club_players;
DROP POLICY IF EXISTS "Users can view own club promotion routes" ON club_promotion_routes;
DROP POLICY IF EXISTS "Users can insert own club promotion routes" ON club_promotion_routes;
DROP POLICY IF EXISTS "Users can update own club promotion routes" ON club_promotion_routes;
DROP POLICY IF EXISTS "Users can delete own club promotion routes" ON club_promotion_routes;
DROP POLICY IF EXISTS "Users can view own club seasons" ON seasons;
DROP POLICY IF EXISTS "Users can insert own club seasons" ON seasons;
DROP POLICY IF EXISTS "Users can update own club seasons" ON seasons;
DROP POLICY IF EXISTS "Users can delete own club seasons" ON seasons;
DROP POLICY IF EXISTS "Users can view own club teams" ON teams;
DROP POLICY IF EXISTS "Users can insert own club teams" ON teams;
DROP POLICY IF EXISTS "Users can update own club teams" ON teams;
DROP POLICY IF EXISTS "Users can delete own club teams" ON teams;

-- Match tables
DROP POLICY IF EXISTS "Users can view own club matches" ON matches;
DROP POLICY IF EXISTS "Users can insert own club matches" ON matches;
DROP POLICY IF EXISTS "Users can update own club matches" ON matches;
DROP POLICY IF EXISTS "Users can delete own club matches" ON matches;
DROP POLICY IF EXISTS "Users can view own club match convocations" ON match_convocations;
DROP POLICY IF EXISTS "Users can insert own club match convocations" ON match_convocations;
DROP POLICY IF EXISTS "Users can update own club match convocations" ON match_convocations;
DROP POLICY IF EXISTS "Users can delete own club match convocations" ON match_convocations;
DROP POLICY IF EXISTS "Users can view own club match player set stats" ON match_player_set_stats;
DROP POLICY IF EXISTS "Users can insert own club match player set stats" ON match_player_set_stats;
DROP POLICY IF EXISTS "Users can update own club match player set stats" ON match_player_set_stats;
DROP POLICY IF EXISTS "Users can delete own club match player set stats" ON match_player_set_stats;

-- Report tables
DROP POLICY IF EXISTS "Users can view own club coach reports" ON coach_reports;
DROP POLICY IF EXISTS "Users can insert own club coach reports" ON coach_reports;
DROP POLICY IF EXISTS "Users can update own club coach reports" ON coach_reports;
DROP POLICY IF EXISTS "Users can delete own club coach reports" ON coach_reports;
DROP POLICY IF EXISTS "Users can view own club player reports" ON player_reports;
DROP POLICY IF EXISTS "Users can insert own club player reports" ON player_reports;
DROP POLICY IF EXISTS "Users can update own club player reports" ON player_reports;
DROP POLICY IF EXISTS "Users can delete own club player reports" ON player_reports;
DROP POLICY IF EXISTS "Users can view own club reports" ON reports;
DROP POLICY IF EXISTS "Users can insert own club reports" ON reports;
DROP POLICY IF EXISTS "Users can update own club reports" ON reports;
DROP POLICY IF EXISTS "Users can delete own club reports" ON reports;

-- Team management
DROP POLICY IF EXISTS "Users can view own club coach team assignments" ON coach_team_assignments;
DROP POLICY IF EXISTS "Users can insert own club coach team assignments" ON coach_team_assignments;
DROP POLICY IF EXISTS "Users can update own club coach team assignments" ON coach_team_assignments;
DROP POLICY IF EXISTS "Users can delete own club coach team assignments" ON coach_team_assignments;
DROP POLICY IF EXISTS "Users can view own club player team season" ON player_team_season;
DROP POLICY IF EXISTS "Users can insert own club player team season" ON player_team_season;
DROP POLICY IF EXISTS "Users can update own club player team season" ON player_team_season;
DROP POLICY IF EXISTS "Users can delete own club player team season" ON player_team_season;
DROP POLICY IF EXISTS "Users can view own club player team season evaluations" ON player_team_season_evaluations;
DROP POLICY IF EXISTS "Users can insert own club player team season evaluations" ON player_team_season_evaluations;
DROP POLICY IF EXISTS "Users can update own club player team season evaluations" ON player_team_season_evaluations;
DROP POLICY IF EXISTS "Users can delete own club player team season evaluations" ON player_team_season_evaluations;

-- Team planning
DROP POLICY IF EXISTS "Users can view own club team season context" ON team_season_context;
DROP POLICY IF EXISTS "Users can insert own club team season context" ON team_season_context;
DROP POLICY IF EXISTS "Users can update own club team season context" ON team_season_context;
DROP POLICY IF EXISTS "Users can delete own club team season context" ON team_season_context;
DROP POLICY IF EXISTS "Users can view own club team season phases" ON team_season_phases;
DROP POLICY IF EXISTS "Users can insert own club team season phases" ON team_season_phases;
DROP POLICY IF EXISTS "Users can update own club team season phases" ON team_season_phases;
DROP POLICY IF EXISTS "Users can delete own club team season phases" ON team_season_phases;
DROP POLICY IF EXISTS "Users can view own club team season plans" ON team_season_plan;
DROP POLICY IF EXISTS "Users can insert own club team season plans" ON team_season_plan;
DROP POLICY IF EXISTS "Users can update own club team season plans" ON team_season_plan;
DROP POLICY IF EXISTS "Users can delete own club team season plans" ON team_season_plan;
DROP POLICY IF EXISTS "Users can view own club training phase evaluation" ON training_phase_evaluation;
DROP POLICY IF EXISTS "Users can insert own club training phase evaluation" ON training_phase_evaluation;
DROP POLICY IF EXISTS "Users can update own club training phase evaluation" ON training_phase_evaluation;
DROP POLICY IF EXISTS "Users can delete own club training phase evaluation" ON training_phase_evaluation;

-- Training
DROP POLICY IF EXISTS "Users can view own club trainings" ON trainings;
DROP POLICY IF EXISTS "Users can insert own club trainings" ON trainings;
DROP POLICY IF EXISTS "Users can update own club trainings" ON trainings;
DROP POLICY IF EXISTS "Users can delete own club trainings" ON trainings;
DROP POLICY IF EXISTS "Users can view own club training attendance" ON training_attendance;
DROP POLICY IF EXISTS "Users can insert own club training attendance" ON training_attendance;
DROP POLICY IF EXISTS "Users can update own club training attendance" ON training_attendance;
DROP POLICY IF EXISTS "Users can delete own club training attendance" ON training_attendance;

-- Player related
DROP POLICY IF EXISTS "Users can view own club player documents" ON player_documents;
DROP POLICY IF EXISTS "Users can insert own club player documents" ON player_documents;
DROP POLICY IF EXISTS "Users can update own club player documents" ON player_documents;
DROP POLICY IF EXISTS "Users can delete own club player documents" ON player_documents;
DROP POLICY IF EXISTS "Users can view own club player guardians" ON player_guardians;
DROP POLICY IF EXISTS "Users can insert own club player guardians" ON player_guardians;
DROP POLICY IF EXISTS "Users can update own club player guardians" ON player_guardians;
DROP POLICY IF EXISTS "Users can delete own club player guardians" ON player_guardians;
DROP POLICY IF EXISTS "Users can view own club player injuries" ON player_injuries;
DROP POLICY IF EXISTS "Users can insert own club player injuries" ON player_injuries;
DROP POLICY IF EXISTS "Users can update own club player injuries" ON player_injuries;
DROP POLICY IF EXISTS "Users can delete own club player injuries" ON player_injuries;
DROP POLICY IF EXISTS "Users can view own club player measurements" ON player_measurements;
DROP POLICY IF EXISTS "Users can insert own club player measurements" ON player_measurements;
DROP POLICY IF EXISTS "Users can update own club player measurements" ON player_measurements;
DROP POLICY IF EXISTS "Users can delete own club player measurements" ON player_measurements;

-- Profiles
DROP POLICY IF EXISTS "Users can view own club profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile only" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- =====================================================
-- Drop ANY other policies that might exist with different names
-- =====================================================
-- This is a catch-all to remove old policies with different naming

-- For each table, drop all policies programmatically
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- =====================================================
-- VERIFICATION: Confirm all policies are removed
-- =====================================================
-- This should return 0 rows
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
