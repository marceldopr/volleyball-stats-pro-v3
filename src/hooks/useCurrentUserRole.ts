import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { coachAssignmentService } from '@/services/coachAssignmentService'
import { seasonService } from '@/services/seasonService'
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
    const { profile } = useAuthStore()

    const [assignedTeamIds, setAssignedTeamIds] = useState<string[]>([])
    // Start loading as true until we determine if we need to fetch teams
    const [loading, setLoading] = useState(true)

    const role = profile?.role || null
    const isDT = role === 'dt'
    const isCoach = role === 'coach'
    const isAdmin = role === 'admin'

    useEffect(() => {
        const fetchAssignedTeams = async () => {
            // console.log('[useCurrentUserRole] Starting fetch:', { isCoach, profileId: profile?.id, clubId: profile?.club_id, loading })

            // Only fetch assignments for coaches - for non-coaches, finish loading immediately
            if (!isCoach || !profile?.id || !profile?.club_id) {
                // console.log('[useCurrentUserRole] Skipping fetch - not coach or missing data')
                setAssignedTeamIds([])
                setLoading(false)
                return
            }

            setLoading(true)
            try {
                // Get current season
                const currentSeason = await seasonService.getCurrentSeasonByClub(profile.club_id)
                // console.log('[useCurrentUserRole] Current season:', currentSeason)

                if (!currentSeason) {
                    // console.log('[useCurrentUserRole] No current season found')
                    setAssignedTeamIds([])
                    setLoading(false)
                    return
                }

                // Fetch assigned teams for current season
                const teamIds = await coachAssignmentService.getAssignedTeamsByUser(
                    profile.id,
                    currentSeason.id
                )

                // console.log('[useCurrentUserRole] Fetched team IDs:', teamIds)
                setAssignedTeamIds(teamIds)
            } catch (error) {
                console.error('[useCurrentUserRole] Error fetching assigned teams:', error)
                setAssignedTeamIds([])
            } finally {
                setLoading(false)
            }
        }

        fetchAssignedTeams()
    }, [isCoach, profile?.id, profile?.club_id])

    return {
        role,
        isDT,
        isCoach,
        isAdmin,
        assignedTeamIds,
        loading
    }
}
