-- Check Team Season Phases
SELECT count(*) as total_phases, season_id, team_id, phase_number 
FROM team_season_phases 
GROUP BY season_id, team_id, phase_number;

-- Check Training Phase Evaluations
SELECT count(*) as total_evals, season_id, team_id, phase_id, status
FROM training_phase_evaluation
GROUP BY season_id, team_id, phase_id, status;

-- Check Team Season Plans (just in case)
SELECT count(*) as total_plans, season_id, team_id
FROM team_season_plan
GROUP BY season_id, team_id;
