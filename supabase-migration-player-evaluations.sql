-- Migration: Unified Player Team Season Evaluations (Refactored)
-- Description: Create unified evaluation table with numeric ratings (1-3) for performance metrics
-- Date: 2025-12-01
-- Breaking Change: This replaces the previous qualitative text-based evaluation system

-- Drop existing table if it exists (WARNING: This will delete all existing evaluations)
DROP TABLE IF EXISTS player_team_season_evaluations CASCADE;

-- Create unified player_team_season_evaluations table
CREATE TABLE player_team_season_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES club_players(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    phase TEXT NOT NULL CHECK (phase IN ('start', 'mid', 'end')),
    
    -- Block 1: Performance Ratings (1-3 scale)
    -- 1 = Needs improvement, 2 = Adequate, 3 = Excellent
    service_rating SMALLINT CHECK (service_rating IS NULL OR (service_rating BETWEEN 1 AND 3)),
    reception_rating SMALLINT CHECK (reception_rating IS NULL OR (reception_rating BETWEEN 1 AND 3)),
    attack_rating SMALLINT CHECK (attack_rating IS NULL OR (attack_rating BETWEEN 1 AND 3)),
    block_rating SMALLINT CHECK (block_rating IS NULL OR (block_rating BETWEEN 1 AND 3)),
    defense_rating SMALLINT CHECK (defense_rating IS NULL OR (defense_rating BETWEEN 1 AND 3)),
    error_impact_rating SMALLINT CHECK (error_impact_rating IS NULL OR (error_impact_rating BETWEEN 1 AND 3)),
    
    -- Block 2: Role in Team
    role_in_team TEXT CHECK (role_in_team IN ('starter', 'rotation', 'specialist', 'development')),
    
    -- Block 3: Competitive Mindset (short text, 150-200 chars)
    competitive_mindset VARCHAR(200),
    
    -- Block 4: Coach Recommendation (short text, 250 chars)
    coach_recommendation VARCHAR(250),
    
    -- Metadata
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one evaluation per phase per player-team-season
    UNIQUE(player_id, team_id, season_id, phase)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_player_evaluations_player ON player_team_season_evaluations(player_id);
CREATE INDEX IF NOT EXISTS idx_player_evaluations_team_season ON player_team_season_evaluations(team_id, season_id);
CREATE INDEX IF NOT EXISTS idx_player_evaluations_phase ON player_team_season_evaluations(phase);
CREATE INDEX IF NOT EXISTS idx_player_evaluations_created_by ON player_team_season_evaluations(created_by);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_player_evaluation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_player_evaluation_updated_at ON player_team_season_evaluations;
CREATE TRIGGER trigger_update_player_evaluation_updated_at
    BEFORE UPDATE ON player_team_season_evaluations
    FOR EACH ROW
    EXECUTE FUNCTION update_player_evaluation_updated_at();

-- Enable RLS
ALTER TABLE player_team_season_evaluations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy: Users can view evaluations for their club
DROP POLICY IF EXISTS "Users can view evaluations for their club" ON player_team_season_evaluations;
CREATE POLICY "Users can view evaluations for their club"
    ON player_team_season_evaluations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.club_id IN (
                SELECT club_id FROM teams WHERE teams.id = player_team_season_evaluations.team_id
            )
        )
    );

-- Policy: DT and Admin can insert/update/delete any evaluation in their club
DROP POLICY IF EXISTS "DT and Admin can manage evaluations" ON player_team_season_evaluations;
CREATE POLICY "DT and Admin can manage evaluations"
    ON player_team_season_evaluations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('dt', 'admin')
            AND profiles.club_id IN (
                SELECT club_id FROM teams WHERE teams.id = player_team_season_evaluations.team_id
            )
        )
    );

-- Policy: Coaches can insert/update evaluations for their assigned teams
DROP POLICY IF EXISTS "Coaches can manage evaluations for assigned teams" ON player_team_season_evaluations;
CREATE POLICY "Coaches can manage evaluations for assigned teams"
    ON player_team_season_evaluations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            JOIN coach_team_assignments cta ON cta.user_id = profiles.id
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('coach', 'assistant')
            AND cta.team_id = player_team_season_evaluations.team_id
            AND cta.season_id = player_team_season_evaluations.season_id
        )
    );

-- Add comment to table
COMMENT ON TABLE player_team_season_evaluations IS 'Unified player evaluation system with numeric ratings (1-3) for performance metrics. Used by coaches to create evaluations and DT to view/analyze player development across teams.';

-- Add comments to rating columns
COMMENT ON COLUMN player_team_season_evaluations.service_rating IS 'Service performance: 1=Needs improvement, 2=Adequate, 3=Excellent';
COMMENT ON COLUMN player_team_season_evaluations.reception_rating IS 'Reception performance: 1=Needs improvement, 2=Adequate, 3=Excellent';
COMMENT ON COLUMN player_team_season_evaluations.attack_rating IS 'Attack performance: 1=Needs improvement, 2=Adequate, 3=Excellent';
COMMENT ON COLUMN player_team_season_evaluations.block_rating IS 'Block performance: 1=Needs improvement, 2=Adequate, 3=Excellent';
COMMENT ON COLUMN player_team_season_evaluations.defense_rating IS 'Defense performance: 1=Needs improvement, 2=Adequate, 3=Excellent';
COMMENT ON COLUMN player_team_season_evaluations.error_impact_rating IS 'Error impact: 1=High impact, 2=Moderate, 3=Low impact';
COMMENT ON COLUMN player_team_season_evaluations.phase IS 'Evaluation phase: start (inicio), mid (mitad), end (final)';
COMMENT ON COLUMN player_team_season_evaluations.competitive_mindset IS 'Short description of player competitive mindset and attitude (max 200 chars)';
COMMENT ON COLUMN player_team_season_evaluations.coach_recommendation IS 'Coach recommendations for future development or category changes (max 250 chars)';
