-- Enable RLS on teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Drop potentially conflicting policies
DROP POLICY IF EXISTS "Users can view teams from their club" ON teams;
DROP POLICY IF EXISTS "Coaches can view assigned teams" ON teams;
DROP POLICY IF EXISTS "DTs and Admins can manage teams" ON teams;
DROP POLICY IF EXISTS "Coaches can view teams where they are staff" ON teams;

-- 1. DTs and Admins: Full access to their club's teams
CREATE POLICY "DTs and Admins can manage teams"
ON teams
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND club_id = teams.club_id
    AND role IN ('dt', 'admin')
  )
);

-- 2. Coaches: View teams they are assigned to (via assignments table)
CREATE POLICY "Coaches can view assigned teams"
ON teams
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM coach_team_assignments
    WHERE team_id = teams.id
    AND user_id = auth.uid()
  )
);

-- 3. Coaches: View teams where they are directly linked as head/assistant coach
CREATE POLICY "Coaches can view teams where they are staff"
ON teams
FOR SELECT
USING (
  head_coach_id = auth.uid() OR assistant_coach_id = auth.uid()
);

-- Ensure coach_team_assignments is readable
ALTER TABLE coach_team_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own assignments" ON coach_team_assignments;

CREATE POLICY "Users can view their own assignments"
ON coach_team_assignments
FOR SELECT
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('dt', 'admin')
  )
);

-- Verification: List teams visible to the current user
SELECT * FROM teams;
