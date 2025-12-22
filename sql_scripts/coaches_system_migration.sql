-- =====================================================
-- COACHES SYSTEM MIGRATION
-- =====================================================
-- Creates new tables for comprehensive coach management
-- while maintaining backward compatibility with existing
-- coach_team_assignments and coach_reports tables.
--
-- Usage: Run this script in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. CREATE COACHES TABLE
-- =====================================================
-- Main entity for coaches (independent from profiles)
-- Can be linked to a user profile via profile_id

CREATE TABLE IF NOT EXISTS coaches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  photo_url TEXT,
  phone TEXT,
  email TEXT,
  notes_internal TEXT, -- DT only
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_coaches_club_id ON coaches(club_id);
CREATE INDEX IF NOT EXISTS idx_coaches_profile_id ON coaches(profile_id);
CREATE INDEX IF NOT EXISTS idx_coaches_status ON coaches(status);

-- =====================================================
-- 2. CREATE COACH_TEAM_SEASON TABLE
-- =====================================================
-- Complete history of coach-team assignments per season

CREATE TABLE IF NOT EXISTS coach_team_season (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  role_in_team TEXT DEFAULT 'head' CHECK (role_in_team IN ('head', 'assistant', 'pf', 'other')),
  date_from DATE,
  date_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(coach_id, team_id, season_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_coach_team_season_coach_id ON coach_team_season(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_team_season_team_id ON coach_team_season(team_id);
CREATE INDEX IF NOT EXISTS idx_coach_team_season_season_id ON coach_team_season(season_id);

-- =====================================================
-- 3. EXTEND COACH_REPORTS TABLE
-- =====================================================
-- Add new fields while keeping existing ones for compatibility

ALTER TABLE coach_reports
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS content_json JSONB;

-- Add comment to clarify dual format
COMMENT ON TABLE coach_reports IS 'Supports both legacy format (asistencia, metodologia, comunicacion, clima_equipo) and new format (title, content_json)';

-- =====================================================
-- 4. RLS POLICIES - COACHES TABLE
-- =====================================================

-- Enable RLS
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (for clean re-run)
DROP POLICY IF EXISTS "coaches_select_policy" ON coaches;
DROP POLICY IF EXISTS "coaches_insert_policy" ON coaches;
DROP POLICY IF EXISTS "coaches_update_policy" ON coaches;
DROP POLICY IF EXISTS "coaches_delete_policy" ON coaches;

-- SELECT: DT can see all coaches in their club, Coaches can see their own profile
CREATE POLICY "coaches_select_policy" ON coaches
  FOR SELECT
  USING (
    club_id IN (
      SELECT club_id FROM profiles WHERE id = auth.uid()
    )
    AND (
      -- DT can see all
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('dt', 'director_tecnic', 'admin')
      )
      OR
      -- Coach can see their own
      profile_id = auth.uid()
    )
  );

-- INSERT: Only DT/Admin can create coaches
CREATE POLICY "coaches_insert_policy" ON coaches
  FOR INSERT
  WITH CHECK (
    club_id IN (
      SELECT club_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('dt', 'director_tecnic', 'admin')
    )
  );

-- UPDATE: Only DT/Admin can update
CREATE POLICY "coaches_update_policy" ON coaches
  FOR UPDATE
  USING (
    club_id IN (
      SELECT club_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('dt', 'director_tecnic', 'admin')
    )
  );

-- DELETE: Only DT/Admin can delete
CREATE POLICY "coaches_delete_policy" ON coaches
  FOR DELETE
  USING (
    club_id IN (
      SELECT club_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('dt', 'director_tecnic', 'admin')
    )
  );

-- =====================================================
-- 5. RLS POLICIES - COACH_TEAM_SEASON TABLE
-- =====================================================

-- Enable RLS
ALTER TABLE coach_team_season ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "coach_team_season_select_policy" ON coach_team_season;
DROP POLICY IF EXISTS "coach_team_season_insert_policy" ON coach_team_season;
DROP POLICY IF EXISTS "coach_team_season_update_policy" ON coach_team_season;
DROP POLICY IF EXISTS "coach_team_season_delete_policy" ON coach_team_season;

-- SELECT: DT can see all, Coaches can see their own assignments
CREATE POLICY "coach_team_season_select_policy" ON coach_team_season
  FOR SELECT
  USING (
    coach_id IN (
      SELECT c.id FROM coaches c
      JOIN profiles p ON c.club_id = p.club_id
      WHERE p.id = auth.uid()
    )
    AND (
      -- DT can see all
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('dt', 'director_tecnic', 'admin')
      )
      OR
      -- Coach can see their own
      coach_id IN (
        SELECT id FROM coaches WHERE profile_id = auth.uid()
      )
    )
  );

-- INSERT: Only DT/Admin
CREATE POLICY "coach_team_season_insert_policy" ON coach_team_season
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM coaches c
      JOIN profiles p ON c.club_id = p.club_id
      WHERE c.id = coach_id
      AND p.id = auth.uid()
      AND p.role IN ('dt', 'director_tecnic', 'admin')
    )
  );

-- UPDATE: Only DT/Admin
CREATE POLICY "coach_team_season_update_policy" ON coach_team_season
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM coaches c
      JOIN profiles p ON c.club_id = p.club_id
      WHERE c.id = coach_id
      AND p.id = auth.uid()
      AND p.role IN ('dt', 'director_tecnic', 'admin')
    )
  );

-- DELETE: Only DT/Admin
CREATE POLICY "coach_team_season_delete_policy" ON coach_team_season
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM coaches c
      JOIN profiles p ON c.club_id = p.club_id
      WHERE c.id = coach_id
      AND p.id = auth.uid()
      AND p.role IN ('dt', 'director_tecnic', 'admin')
    )
  );

-- =====================================================
-- 6. UPDATE RLS FOR COACH_REPORTS (if needed)
-- =====================================================
-- Ensure existing RLS policies are compatible with new fields
-- (No changes needed - existing policies should work)

-- =====================================================
-- 7. MIGRATION HELPER FUNCTION (OPTIONAL)
-- =====================================================
-- Function to migrate data from coach_team_assignments to new structure
-- Run this AFTER creating coaches manually or via service

CREATE OR REPLACE FUNCTION migrate_coach_assignments_to_new_structure()
RETURNS TABLE(migrated_count INTEGER, errors TEXT[]) AS $$
DECLARE
  assignment RECORD;
  coach_record RECORD;
  errors_array TEXT[] := ARRAY[]::TEXT[];
  success_count INTEGER := 0;
BEGIN
  -- Iterate through existing assignments
  FOR assignment IN 
    SELECT cta.*, p.full_name, p.club_id
    FROM coach_team_assignments cta
    JOIN profiles p ON cta.user_id = p.id
  LOOP
    BEGIN
      -- Check if coach exists in new coaches table
      SELECT * INTO coach_record
      FROM coaches
      WHERE profile_id = assignment.user_id;
      
      -- If coach doesn't exist, create entry
      IF NOT FOUND THEN
        INSERT INTO coaches (club_id, profile_id, first_name, last_name, status)
        VALUES (
          assignment.club_id,
          assignment.user_id,
          SPLIT_PART(assignment.full_name, ' ', 1),
          SUBSTRING(assignment.full_name FROM POSITION(' ' IN assignment.full_name) + 1),
          'active'
        )
        RETURNING * INTO coach_record;
      END IF;
      
      -- Insert into coach_team_season (ignore duplicates)
      INSERT INTO coach_team_season (coach_id, team_id, season_id, role_in_team)
      VALUES (
        coach_record.id,
        assignment.team_id,
        assignment.season_id,
        COALESCE(assignment.role_in_team, 'head')
      )
      ON CONFLICT (coach_id, team_id, season_id) DO NOTHING;
      
      success_count := success_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      errors_array := array_append(errors_array, 
        'Error migrating assignment ' || assignment.id || ': ' || SQLERRM);
    END;
  END LOOP;
  
  RETURN QUERY SELECT success_count, errors_array;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the migration

-- Check tables exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_name IN ('coaches', 'coach_team_season');

-- Check RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE tablename IN ('coaches', 'coach_team_season');

-- Check policies exist
-- SELECT tablename, policyname FROM pg_policies 
-- WHERE tablename IN ('coaches', 'coach_team_season');

-- =====================================================
-- NOTES
-- =====================================================
-- 1. Run this script first to create tables
-- 2. Create coaches manually or use services
-- 3. Optionally run: SELECT * FROM migrate_coach_assignments_to_new_structure();
-- 4. Gradually transition from coach_team_assignments to coach_team_season
-- 5. DO NOT delete coach_team_assignments yet - keep for compatibility

-- End of migration script
