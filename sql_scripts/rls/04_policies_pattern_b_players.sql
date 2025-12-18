-- =====================================================
-- RLS SECURITY: Step 4 - Policies for Pattern B (via player_id)
-- =====================================================
-- Purpose: Create RLS policies for tables that reference player_id
-- Pattern: EXISTS (SELECT 1 FROM club_players WHERE club_players.id = table.player_id AND club_players.club_id = user's club_id)
-- =====================================================

-- =====================================================
-- PLAYER_DOCUMENTS
-- =====================================================
CREATE POLICY "Users can view own club player documents"
ON player_documents FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM club_players
    WHERE club_players.id = player_documents.player_id
    AND club_players.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert own club player documents"
ON player_documents FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM club_players
    WHERE club_players.id = player_documents.player_id
    AND club_players.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can update own club player documents"
ON player_documents FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM club_players
    WHERE club_players.id = player_documents.player_id
    AND club_players.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM club_players
    WHERE club_players.id = player_documents.player_id
    AND club_players.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can delete own club player documents"
ON player_documents FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM club_players
    WHERE club_players.id = player_documents.player_id
    AND club_players.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);


-- =====================================================
-- PLAYER_GUARDIANS
-- =====================================================
CREATE POLICY "Users can view own club player guardians"
ON player_guardians FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM club_players
    WHERE club_players.id = player_guardians.player_id
    AND club_players.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert own club player guardians"
ON player_guardians FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM club_players
    WHERE club_players.id = player_guardians.player_id
    AND club_players.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can update own club player guardians"
ON player_guardians FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM club_players
    WHERE club_players.id = player_guardians.player_id
    AND club_players.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM club_players
    WHERE club_players.id = player_guardians.player_id
    AND club_players.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can delete own club player guardians"
ON player_guardians FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM club_players
    WHERE club_players.id = player_guardians.player_id
    AND club_players.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);


-- =====================================================
-- PLAYER_INJURIES
-- =====================================================
CREATE POLICY "Users can view own club player injuries"
ON player_injuries FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM club_players
    WHERE club_players.id = player_injuries.player_id
    AND club_players.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert own club player injuries"
ON player_injuries FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM club_players
    WHERE club_players.id = player_injuries.player_id
    AND club_players.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can update own club player injuries"
ON player_injuries FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM club_players
    WHERE club_players.id = player_injuries.player_id
    AND club_players.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM club_players
    WHERE club_players.id = player_injuries.player_id
    AND club_players.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can delete own club player injuries"
ON player_injuries FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM club_players
    WHERE club_players.id = player_injuries.player_id
    AND club_players.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);


-- =====================================================
-- PLAYER_MEASUREMENTS
-- =====================================================
CREATE POLICY "Users can view own club player measurements"
ON player_measurements FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM club_players
    WHERE club_players.id = player_measurements.player_id
    AND club_players.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert own club player measurements"
ON player_measurements FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM club_players
    WHERE club_players.id = player_measurements.player_id
    AND club_players.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can update own club player measurements"
ON player_measurements FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM club_players
    WHERE club_players.id = player_measurements.player_id
    AND club_players.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM club_players
    WHERE club_players.id = player_measurements.player_id
    AND club_players.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can delete own club player measurements"
ON player_measurements FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM club_players
    WHERE club_players.id = player_measurements.player_id
    AND club_players.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  )
);
