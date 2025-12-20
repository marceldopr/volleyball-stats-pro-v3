-- Migration: Create spaces table and RLS policies
-- Description: Adds support for training/match spaces (courts, gyms, etc.) with club-based access control

-- Create spaces table
CREATE TABLE IF NOT EXISTS spaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('interior', 'exterior')),
    capacity INTEGER,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_spaces_club_id ON spaces(club_id);
CREATE INDEX IF NOT EXISTS idx_spaces_is_active ON spaces(is_active);

-- Enable RLS
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- SELECT: Users can view spaces from their club
CREATE POLICY "Users can view spaces from their club"
    ON spaces FOR SELECT
    USING (
        club_id IN (
            SELECT club_id FROM profiles WHERE id = auth.uid()
        )
    );

-- INSERT: DT/Admins can create spaces for their club
CREATE POLICY "DT and admins can create spaces for their club"
    ON spaces FOR INSERT
    WITH CHECK (
        club_id IN (
            SELECT club_id FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('dt', 'admin')
        )
    );

-- UPDATE: DT/Admins can update spaces from their club
CREATE POLICY "DT and admins can update spaces from their club"
    ON spaces FOR UPDATE
    USING (
        club_id IN (
            SELECT club_id FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('dt', 'admin')
        )
    );

-- DELETE: DT/Admins can delete spaces from their club
CREATE POLICY "DT and admins can delete spaces from their club"
    ON spaces FOR DELETE
    USING (
        club_id IN (
            SELECT club_id FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('dt', 'admin')
        )
    );

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_spaces_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER spaces_updated_at
    BEFORE UPDATE ON spaces
    FOR EACH ROW
    EXECUTE FUNCTION update_spaces_updated_at();
