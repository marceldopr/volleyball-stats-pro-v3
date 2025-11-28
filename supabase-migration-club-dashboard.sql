-- Add dominant_weakness and trend fields to training_phase_evaluation table
-- for Club Dashboard - Dirección Técnica

ALTER TABLE training_phase_evaluation
ADD COLUMN IF NOT EXISTS dominant_weakness TEXT,
ADD COLUMN IF NOT EXISTS trend TEXT CHECK (trend IN ('improving', 'declining', 'stable'));

-- Add helpful comment
COMMENT ON COLUMN training_phase_evaluation.dominant_weakness IS 'Concise phrase identifying the primary limitation (e.g., "Recepción corta débil")';
COMMENT ON COLUMN training_phase_evaluation.trend IS 'Human assessment of progress: improving, declining, or stable';
