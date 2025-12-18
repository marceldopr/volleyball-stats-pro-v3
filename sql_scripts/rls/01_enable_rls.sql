-- =====================================================
-- RLS SECURITY: Step 1 - Enable RLS on All Tables
-- =====================================================
-- Purpose: Enable Row Level Security on all public tables
-- This prevents unrestricted access and forces all queries
-- to go through RLS policies
-- =====================================================

-- Core structure tables with direct club_id
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_identifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_promotion_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Match-related tables
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_convocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_player_set_stats ENABLE ROW LEVEL SECURITY;

-- Reporting tables
ALTER TABLE coach_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Team management tables
ALTER TABLE coach_team_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_team_season ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_team_season_evaluations ENABLE ROW LEVEL SECURITY;

-- Team planning tables
ALTER TABLE team_season_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_season_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_season_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_phase_evaluation ENABLE ROW LEVEL SECURITY;

-- Training tables
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_attendance ENABLE ROW LEVEL SECURITY;

-- Player-related tables (via FK)
ALTER TABLE player_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_injuries ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_measurements ENABLE ROW LEVEL SECURITY;

-- User management
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- VERIFICATION: Check RLS status
-- =====================================================
-- Run this query to verify RLS is enabled on all tables:
/*
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
*/
