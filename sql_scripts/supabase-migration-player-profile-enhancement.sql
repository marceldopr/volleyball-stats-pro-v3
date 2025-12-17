-- ================================================================
-- Player Profile Enhancement - Phase 1: Database Schema
-- ================================================================
-- Description: Add new tables for comprehensive player profile
-- Author: Anti
-- Date: 2025-12-17
-- ================================================================

-- ================================================================
-- 1. Modify existing club_players table
-- ================================================================

ALTER TABLE club_players
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS notes_admin TEXT;

COMMENT ON COLUMN club_players.phone IS 'Player contact phone number';
COMMENT ON COLUMN club_players.email IS 'Player contact email';
COMMENT ON COLUMN club_players.notes_admin IS 'Administrative notes for internal use';

-- ================================================================
-- 2. Create player_guardians table
-- ================================================================

CREATE TABLE IF NOT EXISTS player_guardians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES club_players(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    relationship TEXT NOT NULL CHECK (relationship IN ('padre', 'madre', 'tutor', 'otro')),
    phone TEXT,
    email TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_guardians_player ON player_guardians(player_id);

COMMENT ON TABLE player_guardians IS 'Guardian/tutor information for players';
COMMENT ON COLUMN player_guardians.is_primary IS 'Indicates primary contact guardian';

-- ================================================================
-- 3. Create player_documents table
-- ================================================================

CREATE TABLE IF NOT EXISTS player_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES club_players(id) ON DELETE CASCADE,
    federation_ok BOOLEAN DEFAULT false,
    image_consent BOOLEAN DEFAULT false,
    medical_cert_ok BOOLEAN DEFAULT false,
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_player_documents UNIQUE(player_id)
);

COMMENT ON TABLE player_documents IS 'Document status tracking for players (federation, consent, medical)';

-- ================================================================
-- 4. Create player_measurements table
-- ================================================================

CREATE TABLE IF NOT EXISTS player_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES club_players(id) ON DELETE CASCADE,
    season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
    measured_at DATE NOT NULL,
    height_cm NUMERIC(5,2),
    weight_kg NUMERIC(5,2),
    vertical_jump_cm NUMERIC(5,2),
    wingspan_cm NUMERIC(5,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_measurements_player ON player_measurements(player_id);
CREATE INDEX IF NOT EXISTS idx_player_measurements_season ON player_measurements(season_id);
CREATE INDEX IF NOT EXISTS idx_player_measurements_date ON player_measurements(measured_at DESC);

COMMENT ON TABLE player_measurements IS 'Historical physical measurements for players';
COMMENT ON COLUMN player_measurements.measured_at IS 'Date when measurements were taken';

-- ================================================================
-- 5. Create player_injuries table
-- ================================================================

CREATE TABLE IF NOT EXISTS player_injuries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES club_players(id) ON DELETE CASCADE,
    season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    injury_type TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_injuries_player ON player_injuries(player_id);
CREATE INDEX IF NOT EXISTS idx_player_injuries_season ON player_injuries(season_id);
CREATE INDEX IF NOT EXISTS idx_player_injuries_active ON player_injuries(is_active) WHERE is_active = true;

COMMENT ON TABLE player_injuries IS 'Injury history tracking for players';
COMMENT ON COLUMN player_injuries.is_active IS 'True if injury is currently ongoing';
COMMENT ON COLUMN player_injuries.end_date IS 'Date when injury was resolved (NULL if still active)';

-- ================================================================
-- 6. Enable Row Level Security (RLS)
-- ================================================================

ALTER TABLE player_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_injuries ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- 7. Create RLS Policies
-- ================================================================

-- Guardians: Club admins can manage, coaches can view their team players
CREATE POLICY "Club can manage guardians"
ON player_guardians FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM club_players cp
        WHERE cp.id = player_guardians.player_id
        AND cp.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
    )
);

-- Documents: Same as guardians
CREATE POLICY "Club can manage documents"
ON player_documents FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM club_players cp
        WHERE cp.id = player_documents.player_id
        AND cp.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
    )
);

-- Measurements: Same as guardians
CREATE POLICY "Club can manage measurements"
ON player_measurements FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM club_players cp
        WHERE cp.id = player_measurements.player_id
        AND cp.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
    )
);

-- Injuries: Same as guardians
CREATE POLICY "Club can manage injuries"
ON player_injuries FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM club_players cp
        WHERE cp.id = player_injuries.player_id
        AND cp.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
    )
);

-- ================================================================
-- END OF MIGRATION
-- ================================================================
