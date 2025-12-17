-- ========================================
-- DIAGNÒSTIC ULTRA SIMPLIFICAT
-- ========================================

-- QUERY 1: Estructura de matches
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'matches'
ORDER BY ordinal_position;

-- QUERY 2: Estructura de teams
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'teams'
ORDER BY ordinal_position;

-- QUERY 3: Veure tots els camps d'un partit
SELECT *
FROM matches 
LIMIT 1;

-- QUERY 4: Veure tots els camps d'un equip
SELECT *
FROM teams 
LIMIT 1;
