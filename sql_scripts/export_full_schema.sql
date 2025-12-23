-- =====================================================
-- EXPORTAR ESTRUCTURA COMPLETA DE TODAS LAS TABLAS
-- =====================================================
-- Este script exporta TODOS los campos de TODAS las tablas
-- en formato compatible con SCHEMA.md
-- =====================================================

SELECT 
    table_name,
    column_name,
    data_type,
    CASE WHEN is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END as nullable,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Formato para copiar directamente a SCHEMA.md:
-- | table_name | column_name | data_type | nullable |
