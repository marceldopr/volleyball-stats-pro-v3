-- =====================================================
-- RLS SECURITY: Step 5 - Policies for PROFILES (Special Case)
-- =====================================================
-- Purpose: Create RLS policies for the profiles table
-- This is the reference table used by all other policies
-- =====================================================

-- =====================================================
-- PROFILES
-- =====================================================

-- SELECT: Users can view profiles from their own club
CREATE POLICY "Users can view own club profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
);

-- UPDATE: Users can only update their own profile
-- (NOT club-wide, just their personal record)
CREATE POLICY "Users can update own profile only"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- INSERT: Block INSERT from client
-- Profile creation should be handled by backend functions or Supabase Auth triggers
-- Uncomment this if you want to allow INSERT (not recommended for production)
-- CREATE POLICY "Block profile insert from client"
-- ON profiles FOR INSERT
-- TO authenticated
-- WITH CHECK (false);

-- DELETE: Block DELETE from client
-- Profile deletion should be handled by backend functions only
-- Uncomment this if you want to allow DELETE (not recommended unless you have specific logic)
-- CREATE POLICY "Block profile delete from client"
-- ON profiles FOR DELETE
-- TO authenticated
-- USING (false);

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. Profiles is the anchor table for all RLS policies
-- 2. Every user must have exactly one entry in profiles with their club_id
-- 3. The SELECT policy allows users to see other users in their club
--    (needed for coach assignments, team rosters, etc.)
-- 4. The UPDATE policy prevents users from changing other profiles
-- 5. INSERT/DELETE are blocked to prevent tampering
-- 6. Profile creation should happen via:
--    - Supabase Auth trigger (recommended)
--    - Backend function with proper validation
--    - Admin panel (for manual user creation)
