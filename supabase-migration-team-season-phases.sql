-- Create team_season_phases table
CREATE TABLE IF NOT EXISTS team_season_phases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    
    -- Identificación de la fase
    phase_number INTEGER NOT NULL, -- 1, 2, 3
    phase_name TEXT NOT NULL, -- "Construcción", "Expansión", "Rendimiento"
    
    -- A) Objetivo principal
    primary_objective TEXT,
    
    -- B) Objetivos secundarios
    secondary_objectives TEXT[],
    
    -- C) Prioridades técnicas (tags)
    technical_priorities TEXT[],
    
    -- D) Riesgos o debilidades
    risks_weaknesses TEXT,
    
    -- E) KPI simple
    kpi TEXT,
    
    -- Autoevaluación
    evaluation_status TEXT, -- 'Cumplido', 'Parcial', 'No Cumplido', null
    evaluation_reason TEXT,
    lessons_learned TEXT,
    adjustments_next_phase TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(team_id, season_id, phase_number)
);

-- Create updated_at trigger
CREATE TRIGGER update_team_season_phases_updated_at BEFORE UPDATE
    ON team_season_phases FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create default phases for existing team-season combinations
-- This will create 3 default phases for each team-season that doesn't have phases yet
INSERT INTO team_season_phases (team_id, season_id, phase_number, phase_name)
SELECT DISTINCT 
    t.id as team_id,
    t.season_id,
    1 as phase_number,
    'Construcción / Estabilidad' as phase_name
FROM teams t
WHERE NOT EXISTS (
    SELECT 1 FROM team_season_phases p 
    WHERE p.team_id = t.id AND p.season_id = t.season_id AND p.phase_number = 1
);

INSERT INTO team_season_phases (team_id, season_id, phase_number, phase_name)
SELECT DISTINCT 
    t.id as team_id,
    t.season_id,
    2 as phase_number,
    'Expansión / Juego proactivo' as phase_name
FROM teams t
WHERE NOT EXISTS (
    SELECT 1 FROM team_season_phases p 
    WHERE p.team_id = t.id AND p.season_id = t.season_id AND p.phase_number = 2
);

INSERT INTO team_season_phases (team_id, season_id, phase_number, phase_name)
SELECT DISTINCT 
    t.id as team_id,
    t.season_id,
    3 as phase_number,
    'Rendimiento / Competición' as phase_name
FROM teams t
WHERE NOT EXISTS (
    SELECT 1 FROM team_season_phases p 
    WHERE p.team_id = t.id AND p.season_id = t.season_id AND p.phase_number = 3
);
