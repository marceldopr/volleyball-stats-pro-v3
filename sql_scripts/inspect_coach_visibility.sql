-- Inspect RLS policies for teams table
SELECT * FROM pg_policies WHERE tablename = 'teams';

-- Check coach team assignments
SELECT * FROM coach_team_assignments;

-- Check profiles to see roles
SELECT id, full_name, role, club_id FROM profiles;

-- Check teams to see if they exist
SELECT id, name, club_id, season_id FROM teams;
