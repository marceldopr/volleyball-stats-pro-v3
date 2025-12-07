-- Migration: Change Player Evaluations Scale from 1-3 to 1-5
-- Description: Update CHECK constraints to allow ratings from 1 to 5
-- Date: 2025-12-07
-- Breaking Change: NO - Existing 1-3 data remains valid within 1-5 range

-- Drop existing CHECK constraints
ALTER TABLE player_team_season_evaluations
    DROP CONSTRAINT IF EXISTS player_team_season_evaluations_service_rating_check,
    DROP CONSTRAINT IF EXISTS player_team_season_evaluations_reception_rating_check,
    DROP CONSTRAINT IF EXISTS player_team_season_evaluations_attack_rating_check,
    DROP CONSTRAINT IF EXISTS player_team_season_evaluations_block_rating_check,
    DROP CONSTRAINT IF EXISTS player_team_season_evaluations_defense_rating_check,
    DROP CONSTRAINT IF EXISTS player_team_season_evaluations_error_impact_rating_check;

-- Add new CHECK constraints with 1-5 range
ALTER TABLE player_team_season_evaluations
    ADD CONSTRAINT player_team_season_evaluations_service_rating_check 
        CHECK (service_rating IS NULL OR (service_rating BETWEEN 1 AND 5)),
    ADD CONSTRAINT player_team_season_evaluations_reception_rating_check 
        CHECK (reception_rating IS NULL OR (reception_rating BETWEEN 1 AND 5)),
    ADD CONSTRAINT player_team_season_evaluations_attack_rating_check 
        CHECK (attack_rating IS NULL OR (attack_rating BETWEEN 1 AND 5)),
    ADD CONSTRAINT player_team_season_evaluations_block_rating_check 
        CHECK (block_rating IS NULL OR (block_rating BETWEEN 1 AND 5)),
    ADD CONSTRAINT player_team_season_evaluations_defense_rating_check 
        CHECK (defense_rating IS NULL OR (defense_rating BETWEEN 1 AND 5)),
    ADD CONSTRAINT player_team_season_evaluations_error_impact_rating_check 
        CHECK (error_impact_rating IS NULL OR (error_impact_rating BETWEEN 1 AND 5));

-- Update column comments to reflect new scale
COMMENT ON COLUMN player_team_season_evaluations.service_rating IS 'Service performance: 1=Muy mejorable, 2=Mejorable, 3=Adecuado, 4=Bueno, 5=Excelente';
COMMENT ON COLUMN player_team_season_evaluations.reception_rating IS 'Reception performance: 1=Muy mejorable, 2=Mejorable, 3=Adecuado, 4=Bueno, 5=Excelente';
COMMENT ON COLUMN player_team_season_evaluations.attack_rating IS 'Attack performance: 1=Muy mejorable, 2=Mejorable, 3=Adecuado, 4=Bueno, 5=Excelente';
COMMENT ON COLUMN player_team_season_evaluations.block_rating IS 'Block performance: 1=Muy mejorable, 2=Mejorable, 3=Adecuado, 4=Bueno, 5=Excelente';
COMMENT ON COLUMN player_team_season_evaluations.defense_rating IS 'Defense performance: 1=Muy mejorable, 2=Mejorable, 3=Adecuado, 4=Bueno, 5=Excelente';
COMMENT ON COLUMN player_team_season_evaluations.error_impact_rating IS 'Error impact: 1=Muy alto, 2=Alto, 3=Moderado, 4=Bajo, 5=Muy bajo';

-- Update table comment
COMMENT ON TABLE player_team_season_evaluations IS 'Unified player evaluation system with numeric ratings (1-5) for performance metrics. Used by coaches to create evaluations and DT to view/analyze player development across teams.';
