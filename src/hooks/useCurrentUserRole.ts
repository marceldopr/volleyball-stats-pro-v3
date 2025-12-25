import { useEffect, useMemo } from 'react'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/stores/authStore'

interface UseCurrentUserRoleReturn {
    role: UserRole | null
    isDT: boolean
    isCoach: boolean
    isAdmin: boolean
    assignedTeamIds: string[]
    loading: boolean
}

/**
 * Custom hook to get current user's role and assigned teams
 * 
 * For DT/Admin users: assignedTeamIds will be empty (they can see all teams)
 * For Coach users: assignedTeamIds contains only their assigned teams
 */
export function useCurrentUserRole(): UseCurrentUserRoleReturn {
    const { profile, loading: authLoading, assignedTeamIds, fetchAssignments } = useAuthStore()

    // We don't need local loading state for assignments if we rely on store
    // But we might want to trigger fetch if missing

    const role = profile?.role || null
    const isDT = role === 'dt'
    const isCoach = role === 'coach'
    const isAdmin = role === 'admin'

    useEffect(() => {
        // Trigger fetch if coach and not loaded yet
        if (isCoach && assignedTeamIds === null) {
            fetchAssignments()
        }
    }, [isCoach, assignedTeamIds])

    // MEMOIZE the default empty array to preserve reference stability
    const stableAssignedTeamIds = useMemo(() => assignedTeamIds || [], [assignedTeamIds])

    return {
        role,
        isDT,
        isCoach,
        isAdmin,
        // Return stable reference
        assignedTeamIds: stableAssignedTeamIds,
        loading: authLoading // Primarily auth loading, but assignments load in background
    }
}
