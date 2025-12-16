-- SQL Script to Assign Team Identifiers
-- Based on the team names visible in "Gestión de Equipos"

-- This script will assign identifier_id to teams based on their visible names
-- Team names format: "{Category} {Identifier} {Gender}"
-- Examples: "Cadete Taronja Femenino", "Infantil Negre Mixto", "Juvenil Taronja Femenino"

-- Step 1: First, let's see what identifiers exist in your database
-- Run this query to see available identifiers:
SELECT id, name, type, code FROM identifiers ORDER BY type, name;

-- Step 2: Based on the screenshot, I can see these team names:
-- - Júnior Femenino (no identifier visible)
-- - Sénior Femenino (no identifier visible)
-- - Infantil Negre Mixto
-- - Cadete Taronja Femenino
-- - Juvenil Taronja Femenino
-- - Cadete Negre Femenino
-- - Juvenil Negre Femenino
-- - Cadete Blanc Femenino
-- - Infantil Taronja Femenino

-- Step 3: Update teams with identifier_id
-- You'll need to replace 'IDENTIFIER_ID_HERE' with the actual IDs from your identifiers table

-- For teams with "Taronja" identifier:
UPDATE teams 
SET identifier_id = (SELECT id FROM identifiers WHERE name = 'Taronja' LIMIT 1)
WHERE (category_stage = 'Cadete' OR category_stage = 'Juvenil' OR category_stage = 'Infantil')
  AND identifier_id IS NULL
  -- Add a condition to identify teams with "Taronja" in their context
  -- Since custom_name is NULL, we need another way to identify them
  -- Option: Do this manually for now, one team at a time by team ID
;

-- For teams with "Negre" identifier:
UPDATE teams 
SET identifier_id = (SELECT id FROM identifiers WHERE name = 'Negre' LIMIT 1)
WHERE (category_stage = 'Cadete' OR category_stage = 'Juvenil' OR category_stage = 'Infantil')
  AND identifier_id IS NULL
;

-- For teams with "Blanc" identifier:
UPDATE teams 
SET identifier_id = (SELECT id FROM identifiers WHERE name = 'Blanc' LIMIT 1)
WHERE category_stage = 'Cadete'
  AND gender = 'female'
  AND identifier_id IS NULL
;

-- RECOMMENDED APPROACH:
-- Since we can't automatically determine which team has which identifier
-- (because custom_name is NULL), the best approach is to update by team ID:

-- Step 1: Get all team IDs and their categories/genders:
SELECT id, category_stage, gender, custom_name FROM teams WHERE season_id = 'YOUR_SEASON_ID';

-- Step 2: Manually assign based on what you see in the UI:
-- Example (replace with actual IDs from Step 1):

-- Cadete Taronja Femenino
UPDATE teams SET identifier_id = (SELECT id FROM identifiers WHERE name = 'Taronja' LIMIT 1) WHERE id = 'TEAM_ID_HERE';

-- Juvenil Taronja Femenino  
UPDATE teams SET identifier_id = (SELECT id FROM identifiers WHERE name = 'Taronja' LIMIT 1) WHERE id = 'TEAM_ID_HERE';

-- Infantil Taronja Femenino
UPDATE teams SET identifier_id = (SELECT id FROM identifiers WHERE name = 'Taronja' LIMIT 1) WHERE id = 'TEAM_ID_HERE';

-- Cadete Negre Femenino
UPDATE teams SET identifier_id = (SELECT id FROM identifiers WHERE name = 'Negre' LIMIT 1) WHERE id = 'TEAM_ID_HERE';

-- Juvenil Negre Femenino
UPDATE teams SET identifier_id = (SELECT id FROM identifiers WHERE name = 'Negre' LIMIT 1) WHERE id = 'TEAM_ID_HERE';

-- Infantil Negre Mixto
UPDATE teams SET identifier_id = (SELECT id FROM identifiers WHERE name = 'Negre' LIMIT 1) WHERE id = 'TEAM_ID_HERE';

-- Cadete Blanc Femenino
UPDATE teams SET identifier_id = (SELECT id FROM identifiers WHERE name = 'Blanc' LIMIT 1) WHERE id = 'TEAM_ID_HERE';

-- ALTERNATIVE: If you want to use a single UPDATE with CASE:
/*
UPDATE teams
SET identifier_id = CASE
    WHEN id = 'cadete_taronja_id' THEN (SELECT id FROM identifiers WHERE name = 'Taronja' LIMIT 1)
    WHEN id = 'juvenil_taronja_id' THEN (SELECT id FROM identifiers WHERE name = 'Taronja' LIMIT 1)
    WHEN id = 'infantil_taronja_id' THEN (SELECT id FROM identifiers WHERE name = 'Taronja' LIMIT 1)
    WHEN id = 'cadete_negre_id' THEN (SELECT id FROM identifiers WHERE name = 'Negre' LIMIT 1)
    WHEN id = 'juvenil_negre_id' THEN (SELECT id FROM identifiers WHERE name = 'Negre' LIMIT 1)
    WHEN id = 'infantil_negre_id' THEN (SELECT id FROM identifiers WHERE name = 'Negre' LIMIT 1)
    WHEN id = 'cadete_blanc_id' THEN (SELECT id FROM identifiers WHERE name = 'Blanc' LIMIT 1)
    ELSE identifier_id
END
WHERE id IN ('cadete_taronja_id', 'juvenil_taronja_id', ...);
*/

-- Step 3: Verify the updates:
SELECT 
    t.id,
    t.category_stage,
    t.gender,
    t.custom_name,
    i.name as identifier_name
FROM teams t
LEFT JOIN identifiers i ON t.identifier_id = i.id
WHERE t.season_id = 'YOUR_SEASON_ID'
ORDER BY t.category_stage, i.name;
