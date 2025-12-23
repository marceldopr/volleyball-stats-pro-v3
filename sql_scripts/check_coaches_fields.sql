-- Ver todos los campos de la tabla COACHES
SELECT 
    column_name,
    data_type,
    CASE WHEN is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END as nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'coaches'
ORDER BY ordinal_position;
