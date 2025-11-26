-- ========================================
-- FIX: RLS POLICIES FOR PROFILES
-- ========================================
-- El error "Error al cargar datos" suele deberse a que Supabase bloquea
-- el acceso a la tabla 'profiles' por defecto si no hay una política de lectura.
-- Este script permite que los usuarios autenticados puedan ver los perfiles.

-- 1. Habilitar RLS (por si acaso)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Crear política de lectura para usuarios autenticados
-- Esto permite que el DT pueda ver la lista de entrenadores (y viceversa)
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;

CREATE POLICY "Profiles are viewable by authenticated users"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- 3. Verificar que la política se ha creado
SELECT * FROM pg_policies WHERE tablename = 'profiles';
