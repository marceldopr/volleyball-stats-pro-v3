-- Create training_phase_evaluation table
CREATE TABLE IF NOT EXISTS training_phase_evaluation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    phase_id UUID NOT NULL REFERENCES team_season_phases(id) ON DELETE CASCADE,
    
    -- 1) Estado de cumplimiento
    status TEXT NOT NULL CHECK (status IN ('Cumplido', 'Parcial', 'No Cumplido')),
    
    -- 2) Motivos / Evidencias
    reasons TEXT NOT NULL,
    
    -- 3) Impacto observado en partido
    match_impact TEXT,
    
    -- 4) Ajustes para la siguiente fase
    next_adjustments TEXT NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(phase_id)
);

-- Create updated_at trigger
CREATE TRIGGER update_training_phase_evaluation_updated_at BEFORE UPDATE
    ON training_phase_evaluation FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Remove evaluation fields from team_season_phases (they now live in training_phase_evaluation)
ALTER TABLE team_season_phases
DROP COLUMN IF EXISTS evaluation_status,
DROP COLUMN IF EXISTS evaluation_reason,
DROP COLUMN IF EXISTS lessons_learned,
DROP COLUMN IF EXISTS adjustments_next_phase;
