-- Check matches and their team_ids against teams table
SELECT 
    m.id as match_id,
    m.team_id as match_team_id,
    m.club_id as match_club_id,
    t.id as team_table_id,
    t.custom_name,
    t.club_id as team_club_id
FROM matches m
LEFT JOIN teams t ON m.team_id = t.id
WHERE m.status = 'finished'
LIMIT 10;

-- Check if there are teams for the club used in the matches
SELECT * FROM teams WHERE club_id IN (SELECT DISTINCT club_id FROM matches WHERE status = 'finished');
