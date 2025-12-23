-- Estructura de las 3 tablas faltantes en SCHEMA.md

-- 1. player_secondary_assignments
SELECT 
    'player_secondary_assignments' as tabla,
    column_name,
    data_type,
    CASE WHEN is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END as nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'player_secondary_assignments'
ORDER BY ordinal_position;

-- 2. spaces
SELECT 
    'spaces' as tabla,
    column_name,
    data_type,
    CASE WHEN is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END as nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'spaces'
ORDER BY ordinal_position;

-- 3. training_schedules
SELECT 
    'training_schedules' as tabla,
    column_name,
    data_type,
    CASE WHEN is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END as nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'training_schedules'
ORDER BY ordinal_position;
