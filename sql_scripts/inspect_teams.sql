-- Script para inspeccionar la tabla TEAMS
-- Ejecuta esto para ver qué columnas existen realmente y qué datos tienen

SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'teams';

-- Ver los primeros 5 equipos para entender los datos actuales
SELECT * FROM teams LIMIT 5;
