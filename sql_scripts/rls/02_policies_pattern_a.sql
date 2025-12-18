-- =====================================================
-- RLS SECURITY: Step 2 - Policies for Pattern A Tables
-- =====================================================
-- Purpose: Create RLS policies for tables with direct club_id
-- Pattern: club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
-- =====================================================

-- =====================================================
-- CLUBS
-- =====================================================
CREATE POLICY "Users can view own club"
ON clubs FOR SELECT
TO authenticated
USING (id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

-- Prevent INSERT/UPDATE/DELETE from client (admin only operations)
-- These would typically be done via backend functions or admin panel


-- =====================================================
-- CLUB_CATEGORIES
-- =====================================================
CREATE POLICY "Users can view own club categories"
ON club_categories FOR SELECT
TO authenticated
USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own club categories"
ON club_categories FOR INSERT
TO authenticated
WITH CHECK (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own club categories"
ON club_categories FOR UPDATE
TO authenticated
USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own club categories"
ON club_categories FOR DELETE
TO authenticated
USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));


-- =====================================================
-- CLUB_IDENTIFIERS
-- =====================================================
CREATE POLICY "Users can view own club identifiers"
ON club_identifiers FOR SELECT
TO authenticated
USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own club identifiers"
ON club_identifiers FOR INSERT
TO authenticated
WITH CHECK (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own club identifiers"
ON club_identifiers FOR UPDATE
TO authenticated
USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own club identifiers"
ON club_identifiers FOR DELETE
TO authenticated
USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));


-- =====================================================
-- CLUB_PLAYERS
-- =====================================================
CREATE POLICY "Users can view own club players"
ON club_players FOR SELECT
TO authenticated
USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own club players"
ON club_players FOR INSERT
TO authenticated
WITH CHECK (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own club players"
ON club_players FOR UPDATE
TO authenticated
USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own club players"
ON club_players FOR DELETE
TO authenticated
USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));


-- =====================================================
-- CLUB_PROMOTION_ROUTES
-- =====================================================
CREATE POLICY "Users can view own club promotion routes"
ON club_promotion_routes FOR SELECT
TO authenticated
USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own club promotion routes"
ON club_promotion_routes FOR INSERT
TO authenticated
WITH CHECK (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own club promotion routes"
ON club_promotion_routes FOR UPDATE
TO authenticated
USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own club promotion routes"
ON club_promotion_routes FOR DELETE
TO authenticated
USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));


-- =====================================================
-- SEASONS
-- =====================================================
CREATE POLICY "Users can view own club seasons"
ON seasons FOR SELECT
TO authenticated
USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own club seasons"
ON seasons FOR INSERT
TO authenticated
WITH CHECK (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own club seasons"
ON seasons FOR UPDATE
TO authenticated
USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own club seasons"
ON seasons FOR DELETE
TO authenticated
USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));


-- =====================================================
-- TEAMS
-- =====================================================
CREATE POLICY "Users can view own club teams"
ON teams FOR SELECT
TO authenticated
USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own club teams"
ON teams FOR INSERT
TO authenticated
WITH CHECK (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own club teams"
ON teams FOR UPDATE
TO authenticated
USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own club teams"
ON teams FOR DELETE
TO authenticated
USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));


-- =====================================================
-- MATCHES
-- =====================================================
CREATE POLICY "Users can view own club matches"
ON matches FOR SELECT
TO authenticated
USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own club matches"
ON matches FOR INSERT
TO authenticated
WITH CHECK (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own club matches"
ON matches FOR UPDATE
TO authenticated
USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own club matches"
ON matches FOR DELETE
TO authenticated
USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));


-- =====================================================
-- COACH_REPORTS
-- =====================================================
CREATE POLICY "Users can view own club coach reports"
ON coach_reports FOR SELECT
TO authenticated
USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own club coach reports"
ON coach_reports FOR INSERT
TO authenticated
WITH CHECK (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own club coach reports"
ON coach_reports FOR UPDATE
TO authenticated
USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own club coach reports"
ON coach_reports FOR DELETE
TO authenticated
USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));


-- =====================================================
-- PLAYER_REPORTS
-- =====================================================
CREATE POLICY "Users can view own club player reports"
ON player_reports FOR SELECT
TO authenticated
USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own club player reports"
ON player_reports FOR INSERT
TO authenticated
WITH CHECK (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own club player reports"
ON player_reports FOR UPDATE
TO authenticated
USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own club player reports"
ON player_reports FOR DELETE
TO authenticated
USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));


-- =====================================================
-- REPORTS
-- =====================================================
CREATE POLICY "Users can view own club reports"
ON reports FOR SELECT
TO authenticated
USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own club reports"
ON reports FOR INSERT
TO authenticated
WITH CHECK (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own club reports"
ON reports FOR UPDATE
TO authenticated
USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own club reports"
ON reports FOR DELETE
TO authenticated
USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));


-- =====================================================
-- TEAM_SEASON_PLAN
-- =====================================================
CREATE POLICY "Users can view own club team season plans"
ON team_season_plan FOR SELECT
TO authenticated
USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own club team season plans"
ON team_season_plan FOR INSERT
TO authenticated
WITH CHECK (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own club team season plans"
ON team_season_plan FOR UPDATE
TO authenticated
USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own club team season plans"
ON team_season_plan FOR DELETE
TO authenticated
USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));
