-- DIAGNÓSTICO DE RLS (Row Level Security)
-- Ejecuta esto para ver las políticas de seguridad de la tabla

-- 1. Verificar si RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'coach_team_assignments';

-- 2. Ver las políticas existentes
SELECT * FROM pg_policies 
WHERE tablename = 'coach_team_assignments';

-- 3. Intentar simular una lectura como el usuario entrenador (si es posible en tu entorno)
-- Nota: Esto es difícil de simular directamente en SQL Editor sin saber el ID interno de auth,
-- pero las políticas nos darán la pista.

-- LA POLÍTICA DEBERÍA SER ALGO ASÍ:
-- cmd: SELECT
-- qual: (auth.uid() = user_id) OR (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dt')))
