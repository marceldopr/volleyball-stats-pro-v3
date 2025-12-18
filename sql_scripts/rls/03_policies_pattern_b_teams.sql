-- =====================================================
-- RLS SECURITY: Step 3 - Policies for Pattern B (via team_id)
-- =====================================================
-- Purpose: Create RLS policies for tables that reference team_id
-- Pattern: EXISTS (SELECT 1 FROM teams WHERE teams.id = table.team_id AND teams.club_id = user's club_id)
-- =====================================================

-- =====================================================
-- COACH_TEAM_ASSIGNMENTS
-- =====================================================
CREATE POLICY "Users can view own club coach team assignments"
ON coach_team_assignments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = coach_team_assignments.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert own club coach team assignments"
ON coach_team_assignments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = coach_team_assignments.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can update own club coach team assignments"
ON coach_team_assignments FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = coach_team_assignments.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = coach_team_assignments.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can delete own club coach team assignments"
ON coach_team_assignments FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = coach_team_assignments.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);


-- =====================================================
-- MATCH_CONVOCATIONS
-- =====================================================
CREATE POLICY "Users can view own club match convocations"
ON match_convocations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = match_convocations.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert own club match convocations"
ON match_convocations FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = match_convocations.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can update own club match convocations"
ON match_convocations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = match_convocations.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = match_convocations.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can delete own club match convocations"
ON match_convocations FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = match_convocations.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);


-- =====================================================
-- MATCH_PLAYER_SET_STATS
-- =====================================================
CREATE POLICY "Users can view own club match player set stats"
ON match_player_set_stats FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = match_player_set_stats.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert own club match player set stats"
ON match_player_set_stats FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = match_player_set_stats.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can update own club match player set stats"
ON match_player_set_stats FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = match_player_set_stats.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = match_player_set_stats.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can delete own club match player set stats"
ON match_player_set_stats FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = match_player_set_stats.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);


-- =====================================================
-- PLAYER_TEAM_SEASON
-- =====================================================
CREATE POLICY "Users can view own club player team season"
ON player_team_season FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = player_team_season.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert own club player team season"
ON player_team_season FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = player_team_season.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can update own club player team season"
ON player_team_season FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = player_team_season.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = player_team_season.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can delete own club player team season"
ON player_team_season FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = player_team_season.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);


-- =====================================================
-- PLAYER_TEAM_SEASON_EVALUATIONS
-- =====================================================
CREATE POLICY "Users can view own club player team season evaluations"
ON player_team_season_evaluations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = player_team_season_evaluations.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert own club player team season evaluations"
ON player_team_season_evaluations FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = player_team_season_evaluations.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can update own club player team season evaluations"
ON player_team_season_evaluations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = player_team_season_evaluations.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = player_team_season_evaluations.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can delete own club player team season evaluations"
ON player_team_season_evaluations FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = player_team_season_evaluations.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);


-- =====================================================
-- TEAM_SEASON_CONTEXT
-- =====================================================
CREATE POLICY "Users can view own club team season context"
ON team_season_context FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = team_season_context.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert own club team season context"
ON team_season_context FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = team_season_context.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can update own club team season context"
ON team_season_context FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = team_season_context.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = team_season_context.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can delete own club team season context"
ON team_season_context FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = team_season_context.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);


-- =====================================================
-- TEAM_SEASON_PHASES
-- =====================================================
CREATE POLICY "Users can view own club team season phases"
ON team_season_phases FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = team_season_phases.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert own club team season phases"
ON team_season_phases FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = team_season_phases.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can update own club team season phases"
ON team_season_phases FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = team_season_phases.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = team_season_phases.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can delete own club team season phases"
ON team_season_phases FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = team_season_phases.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);


-- =====================================================
-- TRAININGS
-- =====================================================
CREATE POLICY "Users can view own club trainings"
ON trainings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = trainings.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert own club trainings"
ON trainings FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = trainings.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can update own club trainings"
ON trainings FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = trainings.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = trainings.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can delete own club trainings"
ON trainings FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = trainings.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);


-- =====================================================
-- TRAINING_PHASE_EVALUATION
-- =====================================================
CREATE POLICY "Users can view own club training phase evaluation"
ON training_phase_evaluation FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = training_phase_evaluation.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert own club training phase evaluation"
ON training_phase_evaluation FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = training_phase_evaluation.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can update own club training phase evaluation"
ON training_phase_evaluation FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = training_phase_evaluation.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = training_phase_evaluation.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can delete own club training phase evaluation"
ON training_phase_evaluation FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = training_phase_evaluation.team_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);


-- =====================================================
-- TRAINING_ATTENDANCE (nested FK: training_id -> trainings -> team_id -> teams)
-- =====================================================
CREATE POLICY "Users can view own club training attendance"
ON training_attendance FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trainings
    JOIN teams ON teams.id = trainings.team_id
    WHERE trainings.id = training_attendance.training_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert own club training attendance"
ON training_attendance FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trainings
    JOIN teams ON teams.id = trainings.team_id
    WHERE trainings.id = training_attendance.training_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can update own club training attendance"
ON training_attendance FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trainings
    JOIN teams ON teams.id = trainings.team_id
    WHERE trainings.id = training_attendance.training_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trainings
    JOIN teams ON teams.id = trainings.team_id
    WHERE trainings.id = training_attendance.training_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can delete own club training attendance"
ON training_attendance FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trainings
    JOIN teams ON teams.id = trainings.team_id
    WHERE trainings.id = training_attendance.training_id
    AND teams.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);
