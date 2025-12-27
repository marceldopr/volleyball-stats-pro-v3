import { useEffect, useMemo } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
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

    const { uiMode } = useUiStore()

    const role = profile?.role || null

    // Logic: If UI mode is COACH, effectively downgrade DT to Coach
    // isDT is false if in Coach Mode
    const isDT = role === 'dt' && uiMode !== 'COACH'

    // isCoach is true if role is coach OR if role is dt AND in Coach Mode (to access coach views)
    // Note: Originally isCoach was only true for 'coach' role. DTs had separate access.
    // If we want DTs to access Coach routes in Coach Mode, we must enable isCoach.
    const isCoach = role === 'coach' || (role === 'dt' && uiMode === 'COACH')

    const isAdmin = role === 'admin'

    useEffect(() => {
        // Trigger fetch if (coach OR (dt and coach mode)) and not loaded yet
        // If the user switches to Coach Mode, we might need to fetch assignments if they weren't loaded
        if ((isCoach || (role === 'dt' && uiMode === 'COACH')) && assignedTeamIds === null) {
            fetchAssignments()
        }
    }, [isCoach, role, uiMode, assignedTeamIds, fetchAssignments])

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
