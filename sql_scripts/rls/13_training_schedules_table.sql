-- Migration: Create training_schedules table and RLS policies
-- Description: Adds support for training schedules with club-based access control

-- Create training_schedules table
CREATE TABLE IF NOT EXISTS training_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    team_name TEXT NOT NULL,
    days INTEGER[] NOT NULL, -- Array of day numbers 0-6 (0=Mon, 6=Sun)
    start_time TEXT NOT NULL, -- HH:mm format
    end_time TEXT NOT NULL, -- HH:mm format
    preferred_space TEXT NOT NULL,
    alternative_spaces TEXT[], -- Array of space names
    period TEXT NOT NULL CHECK (period IN ('season', 'custom')),
    custom_start_date TEXT,
    custom_end_date TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_training_schedules_club_id ON training_schedules(club_id);
CREATE INDEX IF NOT EXISTS idx_training_schedules_season_id ON training_schedules(season_id);
CREATE INDEX IF NOT EXISTS idx_training_schedules_team_id ON training_schedules(team_id);
CREATE INDEX IF NOT EXISTS idx_training_schedules_is_active ON training_schedules(is_active);

-- Enable RLS
ALTER TABLE training_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- SELECT: Users can view schedules from their club
CREATE POLICY "Users can view schedules from their club"
    ON training_schedules FOR SELECT
    USING (
        club_id IN (
            SELECT club_id FROM profiles WHERE id = auth.uid()
        )
    );

-- INSERT: DT/Admins can create schedules for their club
CREATE POLICY "DT and admins can create schedules for their club"
    ON training_schedules FOR INSERT
    WITH CHECK (
        club_id IN (
            SELECT club_id FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('dt', 'admin')
        )
    );

-- UPDATE: DT/Admins can update schedules from their club
CREATE POLICY "DT and admins can update schedules from their club"
    ON training_schedules FOR UPDATE
    USING (
        club_id IN (
            SELECT club_id FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('dt', 'admin')
        )
    );

-- DELETE: DT/Admins can delete schedules from their club
CREATE POLICY "DT and admins can delete schedules from their club"
    ON training_schedules FOR DELETE
    USING (
        club_id IN (
            SELECT club_id FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('dt', 'admin')
        )
    );

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_training_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER training_schedules_updated_at
    BEFORE UPDATE ON training_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_training_schedules_updated_at();
