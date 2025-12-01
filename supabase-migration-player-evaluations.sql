-- Migration: Player Team Season Evaluations
-- Description: Create table for storing player evaluations (3 per season: start, mid, end)
-- Date: 2025-12-01

-- Create player_team_season_evaluations table
CREATE TABLE IF NOT EXISTS player_team_season_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES club_players(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    evaluation_type TEXT NOT NULL CHECK (evaluation_type IN ('start', 'mid', 'end')),
    
    -- Overall assessment
    level_overall TEXT CHECK (level_overall IN ('below', 'in_line', 'above')),
    
    -- Detailed comments (short, 1-2 sentences each)
    tech_comment TEXT,
    tactic_comment TEXT,
    physical_comment TEXT,
    mental_comment TEXT,
    
    -- Role and recommendations
    role_in_team TEXT CHECK (role_in_team IN ('key_player', 'rotation', 'development')),
    coach_recommendation TEXT,
    
    -- Metadata
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one evaluation per type per player-team-season
    UNIQUE(player_id, team_id, season_id, evaluation_type)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_player_evaluations_player ON player_team_season_evaluations(player_id);
CREATE INDEX IF NOT EXISTS idx_player_evaluations_team_season ON player_team_season_evaluations(team_id, season_id);
CREATE INDEX IF NOT EXISTS idx_player_evaluations_type ON player_team_season_evaluations(evaluation_type);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_player_evaluation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_player_evaluation_updated_at
    BEFORE UPDATE ON player_team_season_evaluations
    FOR EACH ROW
    EXECUTE FUNCTION update_player_evaluation_updated_at();

-- Enable RLS
ALTER TABLE player_team_season_evaluations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy: Users can view evaluations for their club
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
COMMENT ON TABLE player_team_season_evaluations IS 'Stores player evaluations for each season (start, mid, end). Used by coaches to track player development and provide feedback.';
