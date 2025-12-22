-- =====================================================
-- FIX: REFACTOR CONSUME_SIGNUP_TOKEN
-- =====================================================
-- Refactor to separate Auth User creation from Token Consumption.
-- Frontend will call supabase.auth.signUp() first, then this RPC.
-- This avoids permissions/pgcrypto issues with direct auth.users inserts.
-- =====================================================

-- Drop old function with old signature
DROP FUNCTION IF EXISTS consume_signup_token(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

-- Create new function that takes user_id
CREATE OR REPLACE FUNCTION consume_signup_token(
  p_token TEXT,
  p_user_id UUID,
  p_first_name TEXT,
  p_last_name TEXT,
  p_phone TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token_hash TEXT;
  v_token_record RECORD;
  v_coach_id UUID;
  v_club_name TEXT;
  v_email TEXT;
BEGIN
  -- 1. Hash the token
  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');
  
  -- 2. Lock and validate token
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
  
  -- 3. Create or Update profile record
  -- Get email from auth.users (optional, but good for data integrity)
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  
  INSERT INTO profiles (id, club_id, full_name, role)
  VALUES (
    p_user_id,
    v_token_record.club_id,
    p_first_name || ' ' || p_last_name,
    'coach'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    club_id = EXCLUDED.club_id,
    full_name = EXCLUDED.full_name,
    role = 'coach';
  
  -- 4. Create coach record
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
    p_user_id,
    p_first_name,
    p_last_name,
    v_email,
    p_phone,
    'active',
    'pending'
  )
  RETURNING id INTO v_coach_id;
  
  -- 5. Increment token uses
  UPDATE coach_signup_tokens
  SET uses = uses + 1
  WHERE id = v_token_record.id;
  
  -- 6. Get club name
  SELECT name INTO v_club_name
  FROM clubs
  WHERE id = v_token_record.club_id;
  
  -- 7. Return success
  RETURN json_build_object(
    'success', true,
    'coachId', v_coach_id,
    'profileId', p_user_id,
    'clubName', v_club_name
  );
  
EXCEPTION
  WHEN unique_violation THEN
    -- Should not happen for profiles unless ID conflict
    RETURN json_build_object('success', false, 'error', 'PROFILE_EXISTS', 'details', SQLERRM);
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'INTERNAL_ERROR', 'details', SQLERRM);
END;
$$;

-- Grant permissions to anon and authenticated
GRANT EXECUTE ON FUNCTION consume_signup_token(TEXT, UUID, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION consume_signup_token(TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated;
