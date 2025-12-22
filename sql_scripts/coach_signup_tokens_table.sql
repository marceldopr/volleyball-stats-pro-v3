-- =====================================================
-- COACH SIGNUP TOKENS & APPROVAL SYSTEM
-- =====================================================
-- Secure token-based registration for coaches with
-- DT approval workflow. Implements:
-- - Token hashing (SHA-256)
-- - Atomic token consumption
-- - Approval status for coaches
-- - Server-side auth validation
--
-- Usage: Run this script in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. ADD APPROVAL STATUS TO COACHES TABLE
-- =====================================================

ALTER TABLE coaches
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Index for filtering
CREATE INDEX IF NOT EXISTS idx_coaches_approval_status ON coaches(approval_status);

-- Add approved_at tracking
ALTER TABLE coaches
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by_profile_id UUID REFERENCES profiles(id);

-- =====================================================
-- 2. CREATE COACH SIGNUP TOKENS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS coach_signup_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INTEGER NOT NULL DEFAULT 1,
  uses INTEGER NOT NULL DEFAULT 0,
  created_by_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  
  -- Constraints
  CHECK (max_uses > 0),
  CHECK (uses >= 0),
  CHECK (uses <= max_uses)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coach_signup_tokens_club_id ON coach_signup_tokens(club_id);
CREATE INDEX IF NOT EXISTS idx_coach_signup_tokens_token_hash ON coach_signup_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_coach_signup_tokens_expires_at ON coach_signup_tokens(expires_at);

-- =====================================================
-- 3. RLS POLICIES - COACH_SIGNUP_TOKENS
-- =====================================================

ALTER TABLE coach_signup_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "dt_select_club_tokens" ON coach_signup_tokens;
DROP POLICY IF EXISTS "dt_insert_club_tokens" ON coach_signup_tokens;
DROP POLICY IF EXISTS "dt_update_club_tokens" ON coach_signup_tokens;

-- DT can see all tokens from their club
CREATE POLICY "dt_select_club_tokens" ON coach_signup_tokens
  FOR SELECT
  USING (
    club_id IN (
      SELECT club_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('dt', 'director_tecnic', 'admin')
    )
  );

-- DT can create tokens for their club
CREATE POLICY "dt_insert_club_tokens" ON coach_signup_tokens
  FOR INSERT
  WITH CHECK (
    club_id IN (
      SELECT club_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('dt', 'director_tecnic', 'admin')
    )
  );

-- DT can update/revoke their club's tokens
CREATE POLICY "dt_update_club_tokens" ON coach_signup_tokens
  FOR UPDATE
  USING (
    club_id IN (
      SELECT club_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('dt', 'director_tecnic', 'admin')
    )
  );

-- =====================================================
-- 4. UPDATE RLS POLICIES - COACHES TABLE
-- =====================================================
-- Coaches with pending status should not see club data

-- Drop and recreate SELECT policy to include approval check
DROP POLICY IF EXISTS "coaches_select_policy" ON coaches;

CREATE POLICY "coaches_select_policy" ON coaches
  FOR SELECT
  USING (
    club_id IN (
      SELECT club_id FROM profiles WHERE id = auth.uid()
    )
    AND (
      -- DT can see all (including pending)
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('dt', 'director_tecnic', 'admin')
      )
      OR
      -- Coach can only see themselves if approved
      (profile_id = auth.uid() AND approval_status = 'approved')
    )
  );

-- =====================================================
-- 5. ATOMIC TOKEN CONSUMPTION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION consume_signup_token(
  p_token TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token_hash TEXT;
  v_token_record RECORD;
  v_coach_id UUID;
  v_profile_id UUID;
  v_club_name TEXT;
BEGIN
  -- 1. Hash the token
  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');
  
  -- 2. Lock and validate token (FOR UPDATE = row lock)
  SELECT * INTO v_token_record
  FROM coach_signup_tokens
  WHERE token_hash = v_token_hash
  FOR UPDATE;
  
  -- Check if token exists
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'TOKEN_INVALID');
  END IF;
  
  -- Check if expired
  IF v_token_record.expires_at < NOW() THEN
    RETURN json_build_object('success', false, 'error', 'TOKEN_EXPIRED');
  END IF;
  
  -- Check if revoked
  IF v_token_record.revoked_at IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'TOKEN_REVOKED');
  END IF;
  
  -- Check if max uses reached
  IF v_token_record.uses >= v_token_record.max_uses THEN
    RETURN json_build_object('success', false, 'error', 'TOKEN_MAX_USES');
  END IF;
  
  -- 3. Create profile with auth
  INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    json_build_object('provider', 'email', 'providers', ARRAY['email']),
    json_build_object('full_name', p_first_name || ' ' || p_last_name),
    NOW(),
    NOW()
  )
  RETURNING id INTO v_profile_id;
  
  -- 4. Create profile record
  INSERT INTO profiles (id, club_id, full_name, role)
  VALUES (
    v_profile_id,
    v_token_record.club_id,
    p_first_name || ' ' || p_last_name,
    'coach'
  );
  
  -- 5. Create coach record with pending status
  INSERT INTO coaches (
    club_id,
    profile_id,
    first_name,
    last_name,
    email,
    phone,
    status,
    approval_status
  ) VALUES (
    v_token_record.club_id,
    v_profile_id,
    p_first_name,
    p_last_name,
    p_email,
    p_phone,
    'active',
    'pending'
  )
  RETURNING id INTO v_coach_id;
  
  -- 6. Increment token uses
  UPDATE coach_signup_tokens
  SET uses = uses + 1
  WHERE id = v_token_record.id;
  
  -- 7. Get club name for response
  SELECT name INTO v_club_name
  FROM clubs
  WHERE id = v_token_record.club_id;
  
  -- 8. Return success
  RETURN json_build_object(
    'success', true,
    'coachId', v_coach_id,
    'profileId', v_profile_id,
    'clubName', v_club_name,
    'email', p_email
  );
  
EXCEPTION
  WHEN unique_violation THEN
    -- Email already exists
    RETURN json_build_object('success', false, 'error', 'EMAIL_EXISTS');
  WHEN OTHERS THEN
    -- Any other error
    RETURN json_build_object('success', false, 'error', 'INTERNAL_ERROR', 'details', SQLERRM);
END;
$$;

-- =====================================================
-- 6. HELPER FUNCTION - VALIDATE TOKEN
-- =====================================================

CREATE OR REPLACE FUNCTION validate_signup_token(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token_hash TEXT;
  v_result JSON;
BEGIN
  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');
  
  SELECT json_build_object(
    'isValid', CASE 
      WHEN t.id IS NULL THEN false
      WHEN t.expires_at < NOW() THEN false
      WHEN t.revoked_at IS NOT NULL THEN false
      WHEN t.uses >= t.max_uses THEN false
      ELSE true
    END,
    'clubId', c.id,
    'clubName', c.name,
    'expiresAt', t.expires_at,
    'error', CASE
      WHEN t.id IS NULL THEN 'TOKEN_INVALID'
      WHEN t.expires_at < NOW() THEN 'TOKEN_EXPIRED'
      WHEN t.revoked_at IS NOT NULL THEN 'TOKEN_REVOKED'
      WHEN t.uses >= t.max_uses THEN 'TOKEN_MAX_USES'
      ELSE NULL
    END
  ) INTO v_result
  FROM coach_signup_tokens t
  JOIN clubs c ON t.club_id = c.id
  WHERE t.token_hash = v_token_hash;
  
  -- If no token found
  IF v_result IS NULL THEN
    v_result := json_build_object('isValid', false, 'error', 'TOKEN_INVALID');
  END IF;
  
  RETURN v_result;
END;
$$;

-- =====================================================
-- 7. VERIFICATION QUERIES
-- =====================================================

-- Check new columns exist
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'coaches' AND column_name LIKE 'approval%';

-- Check token table exists
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_name = 'coach_signup_tokens';

-- Check functions exist
-- SELECT routine_name FROM information_schema.routines 
-- WHERE routine_name IN ('consume_signup_token', 'validate_signup_token');

-- =====================================================
-- NOTES
-- =====================================================
-- 1. Token consumption is atomic (row lock + transaction)
-- 2. Password hashing handled by auth.users
-- 3. Coaches start as 'pending' approval
-- 4. DT must approve before coach can access data
-- 5. Token hash ensures no plain tokens in DB

-- End of migration script
