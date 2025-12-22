-- =====================================================
-- FIX: Allow anonymous access to RPC functions
-- =====================================================
-- This allows the signup page to validate and consume tokens
-- via the SECURITY DEFINER functions without needing
-- direct table access
-- =====================================================

-- Grant EXECUTE on functions to anonymous users
GRANT EXECUTE ON FUNCTION validate_signup_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION consume_signup_token(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;

-- Also grant to authenticated users
GRANT EXECUTE ON FUNCTION validate_signup_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION consume_signup_token(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Verification query
-- SELECT routine_name, has_function_privilege('anon', 'validate_signup_token(TEXT)', 'EXECUTE');
