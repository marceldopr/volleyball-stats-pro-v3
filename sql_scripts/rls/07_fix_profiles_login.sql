-- =====================================================
-- DEFINITIVE FIX: Use Helper Function in PUBLIC schema
-- =====================================================
-- Problem: Cannot create functions in auth schema without admin privileges
-- Solution: Create the helper function in public schema instead
-- =====================================================

-- Step 1: Create a SECURITY DEFINER function in PUBLIC schema to get user's club_id
-- This function runs with elevated privileges and bypasses RLS
CREATE OR REPLACE FUNCTION public.get_user_club_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT club_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Step 2: Drop ALL existing policies on profiles
DROP POLICY IF EXISTS "Users can view own club profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read club profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile only" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Step 3: Create simple SELECT policy using the helper function
CREATE POLICY "Users can view profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  -- Users can see their own profile
  id = auth.uid()
  OR
  -- Users can see profiles from the same club (using helper function, no recursion!)
  club_id = public.get_user_club_id()
);

-- Step 4: Create UPDATE policy (users can only update their own profile)
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- Expected: 2 policies
-- ✅ Users can view profiles (SELECT)
-- ✅ Users can update own profile (UPDATE)

-- =====================================================
-- TEST: Verify the helper function works
-- =====================================================
-- This should return your club_id (run it while authenticated from your app)
-- SELECT public.get_user_club_id();
