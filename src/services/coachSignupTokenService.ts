import { supabase } from '@/lib/supabaseClient'
import type {
    CreateSignupTokenParams,
    GeneratedSignupLink,
    SignupTokenInfo,
    TokenValidationResult,
    CoachSignupData,
    SignupResult
} from '@/types/CoachSignupToken'

// Generate cryptographically secure random token
function generateSecureToken(): string {
    const array = new Uint8Array(32) // 32 bytes = 256 bits
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// Hash token with SHA-256
async function hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(token)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export const coachSignupTokenService = {
    /**
     * Create a new signup token for coaches
     * IMPORTANT: clubId and createdByProfileId are obtained from auth.uid()
     * Frontend should NOT send these values
     */
    createSignupToken: async (
        params: CreateSignupTokenParams = {}
    ): Promise<GeneratedSignupLink> => {
        const expiresInDays = params.expiresInDays || 7
        const maxUses = params.maxUses || 1

        // Get clubId and profileId from authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            throw new Error('Not authenticated')
        }

        // Get profile to get club_id and verify role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('club_id, role')
            .eq('id', user.id)
            .single()

        if (profileError || !profile) {
            throw new Error('Profile not found')
        }

        // Verify user is DT/Admin
        if (!['dt', 'director_tecnic', 'admin'].includes(profile.role)) {
            throw new Error('Unauthorized: Only DT can create signup tokens')
        }

        // Generate token
        const token = generateSecureToken()
        const tokenHash = await hashToken(token)

        // Calculate expiration
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + expiresInDays)

        // Insert token (RLS will validate club_id matches auth.uid's club)
        const { data, error } = await supabase
            .from('coach_signup_tokens')
            .insert({
                club_id: profile.club_id,
                token_hash: tokenHash,
                expires_at: expiresAt.toISOString(),
                max_uses: maxUses,
                created_by_profile_id: user.id
            })
            .select('id, expires_at, max_uses')
            .single()

        if (error) {
            console.error('Error creating signup token:', error)
            throw error
        }

        // Build signup URL
        const baseUrl = window.location.origin
        const signupUrl = `${baseUrl}/signup/coach?token=${token}`

        return {
            signupUrl,
            tokenId: data.id,
            expiresAt: data.expires_at,
            maxUses: data.max_uses
        }
    },

    /**
     * Get active tokens for the authenticated user's club
     * Returns token info without token in clear
     */
    getActiveTokensByClub: async (): Promise<SignupTokenInfo[]> => {
        // Get clubId from authenticated user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { data: profile } = await supabase
            .from('profiles')
            .select('club_id')
            .eq('id', user.id)
            .single()

        if (!profile) throw new Error('Profile not found')

        const { data, error } = await supabase
            .from('coach_signup_tokens')
            .select('*')
            .eq('club_id', profile.club_id)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching tokens:', error)
            throw error
        }

        const now = new Date()

        return (data || []).map(token => ({
            id: token.id,
            expiresAt: token.expires_at,
            maxUses: token.max_uses,
            uses: token.uses,
            createdAt: token.created_at,
            isExpired: new Date(token.expires_at) < now,
            isRevoked: token.revoked_at !== null,
            usesRemaining: Math.max(0, token.max_uses - token.uses)
        }))
    },

    /**
     * Validate token (for signup page load)
     * Calls SQL function to validate
     */
    validateToken: async (token: string): Promise<TokenValidationResult> => {
        const { data, error } = await supabase.rpc('validate_signup_token', {
            p_token: token
        })

        if (error) {
            console.error('Error validating token:', error)
            return {
                isValid: false,
                error: 'TOKEN_INVALID'
            }
        }

        return data as TokenValidationResult
    },

    /**
     * Consume token and create coach (atomic)
     * Calls SQL function that handles everything
     */
    /**
     * Consume token and create profile/coach (after auth.signUp)
     */
    consumeToken: async (
        token: string,
        userId: string,
        coachData: Omit<CoachSignupData, 'password'>
    ): Promise<SignupResult> => {
        const { data, error } = await supabase.rpc('consume_signup_token', {
            p_token: token,
            p_user_id: userId,
            p_first_name: coachData.firstName,
            p_last_name: coachData.lastName,
            p_phone: coachData.phone
        })

        if (error) {
            console.error('Error consuming token:', error)
            return {
                success: false,
                error: 'INTERNAL_ERROR',
                details: error.message
            }
        }

        return data as SignupResult
    },

    /**
     * Revoke a token manually
     */
    revokeToken: async (tokenId: string): Promise<void> => {
        const { error } = await supabase
            .from('coach_signup_tokens')
            .update({ revoked_at: new Date().toISOString() })
            .eq('id', tokenId)

        if (error) {
            console.error('Error revoking token:', error)
            throw error
        }
    }
}
