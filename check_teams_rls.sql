-- DIAGNÓSTICO DE RLS PARA LA TABLA TEAMS
-- Verificamos si los entrenadores tienen permiso para ver los equipos

SELECT * FROM pg_policies 
WHERE tablename = 'teams';
