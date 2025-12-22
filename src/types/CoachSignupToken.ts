// Coach Signup Token Types

export interface CoachSignupTokenDB {
    id: string
    club_id: string
    token_hash: string
    expires_at: string
    max_uses: number
    uses: number
    created_by_profile_id: string
    created_at: string
    revoked_at: string | null
}

export interface CreateSignupTokenParams {
    expiresInDays?: number  // default 7
    maxUses?: number        // default 1
}

export interface SignupTokenInfo {
    id: string
    expiresAt: string
    maxUses: number
    uses: number
    createdAt: string
    isExpired: boolean
    isRevoked: boolean
    usesRemaining: number
}

export interface GeneratedSignupLink {
    signupUrl: string
    tokenId: string
    expiresAt: string
    maxUses: number
}

export interface TokenValidationResult {
    isValid: boolean
    clubId?: string
    clubName?: string
    expiresAt?: string
    error?: 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'TOKEN_REVOKED' | 'TOKEN_MAX_USES'
}

export interface CoachSignupData {
    firstName: string
    lastName: string
    email: string
    phone: string
    password: string
}

export interface SignupResult {
    success: boolean
    coachId?: string
    profileId?: string
    clubName?: string
    email?: string
    error?: 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'TOKEN_REVOKED' | 'TOKEN_MAX_USES' | 'EMAIL_EXISTS' | 'INTERNAL_ERROR'
    details?: string
}
