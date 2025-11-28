-- Create team_season_context table
CREATE TABLE IF NOT EXISTS team_season_context (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    
    -- Objetivos
    primary_goal TEXT,
    secondary_goals TEXT[],
    
    -- Prioridades técnicas
    training_focus TEXT[],
    
    -- Roles y jerarquías
    role_hierarchy TEXT,
    default_rotation_notes TEXT,
    
    -- Reglas internas
    internal_rules TEXT[],
    
    -- Notas del staff
    staff_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(team_id, season_id)
);

-- Enable RLS (temporarily disabled for testing)
-- ALTER TABLE team_season_context ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies commented out until we verify the correct user table name
-- Uncomment and adjust after confirming the schema

-- CREATE POLICY "Users can view context for their club's teams"
--     ON team_season_context FOR SELECT
--     USING (
--         team_id IN (
--             SELECT id FROM teams WHERE club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
--         )
--     );

-- CREATE POLICY "Users can manage context for their club's teams"
--     ON team_season_context FOR ALL
--     USING (
--         team_id IN (
--             SELECT id FROM teams WHERE club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
--         )
--     );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_team_season_context_updated_at BEFORE UPDATE
    ON team_season_context FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
