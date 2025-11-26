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
    const [loading, setLoading] = useState(false)

    const role = profile?.role || null
    const isDT = role === 'dt'
    const isCoach = role === 'coach'
    const isAdmin = role === 'admin'

    useEffect(() => {
        const fetchAssignedTeams = async () => {
            // Only fetch assignments for coaches
            if (!isCoach || !profile?.id || !profile?.club_id) {
                setAssignedTeamIds([])
                return
            }

            setLoading(true)
            try {
                // Get current season
                const currentSeason = await seasonService.getCurrentSeasonByClub(profile.club_id)

                if (!currentSeason) {
                    setAssignedTeamIds([])
                    setLoading(false)
                    return
                }

                // Fetch assigned teams for current season
                const teamIds = await coachAssignmentService.getAssignedTeamsByUser(
                    profile.id,
                    currentSeason.id
                )

                setAssignedTeamIds(teamIds)
            } catch (error) {
                console.error('Error fetching assigned teams:', error)
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
