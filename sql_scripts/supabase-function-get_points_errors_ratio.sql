-- Function: get_points_errors_ratio
-- Description: Calculate total points and errors for a team's recent finished matches
-- Parameters:
--   p_team_id: UUID of the team
--   p_limit: Number of recent matches to consider (default: 5)
-- Returns: Table with total_points and total_errors
-- Date: 2024-12-06

CREATE OR REPLACE FUNCTION get_points_errors_ratio(
  p_team_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  total_points BIGINT,
  total_errors BIGINT
)
LANGUAGE SQL
STABLE
AS $$
  WITH recent_matches AS (
    SELECT id
    FROM matches
    WHERE team_id = p_team_id
      AND status = 'finished'
    ORDER BY match_date DESC
    LIMIT p_limit
  )
  SELECT
    COALESCE(SUM(kills + aces + blocks), 0)::BIGINT AS total_points,
    COALESCE(SUM(attack_errors + serve_errors + block_errors + reception_errors), 0)::BIGINT AS total_errors
  FROM match_player_set_stats
  WHERE team_id = p_team_id
    AND match_id IN (SELECT id FROM recent_matches);
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_points_errors_ratio(UUID, INTEGER) TO authenticated;

-- Example usage:
-- SELECT * FROM get_points_errors_ratio('team-uuid-here'::uuid, 5);
