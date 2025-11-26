import { supabase } from '@/lib/supabaseClient'

export interface CoachTeamAssignmentDB {
    id: string
    user_id: string
    team_id: string
    season_id: string
    role_in_team: string | null
    created_at: string
    updated_at: string
}

export interface CoachWithAssignments {
    id: string
    full_name: string
    email: string
    role: string
    assignments: Array<{
        id: string
        team_id: string
        team_name: string
        season_id: string
    }>
}

export const coachAssignmentService = {
    /**
     * Get all coaches with their team assignments for a specific club and season
     * @param clubId - The club ID
     * @param seasonId - The season ID
     * @returns Array of coaches with their assignments
     */
    getCoachesWithAssignments: async (clubId: string, seasonId: string): Promise<CoachWithAssignments[]> => {
        console.log('[getCoachesWithAssignments] Starting query with:', { clubId, seasonId })

        // 1. Get all coaches from the club
        // NOTE: Removed 'email' from select as it likely doesn't exist in profiles table and causes 400 error
        // NOTE: Checking for both 'coach' and 'entrenador' to handle legacy data
        const { data: coaches, error: coachesError } = await supabase
            .from('profiles')
            .select('id, full_name, role, club_id')
            .eq('club_id', clubId)
            .in('role', ['coach', 'entrenador'])

        console.log('[getCoachesWithAssignments] Coaches query result:', {
            count: coaches?.length || 0,
            coaches: coaches?.map(c => ({ id: c.id, name: c.full_name, role: c.role })),
            error: coachesError
        })

        if (coachesError) {
            console.error('[getCoachesWithAssignments] Error fetching coaches:', coachesError)
            throw coachesError
        }

        if (!coaches || coaches.length === 0) {
            console.warn('[getCoachesWithAssignments] No coaches found for club:', clubId)
            return []
        }

        // 2. Get all assignments for these coaches in the current season
        const coachIds = coaches.map(c => c.id)
        console.log('[getCoachesWithAssignments] Fetching assignments for coach IDs:', coachIds)

        const { data: assignments, error: assignmentsError } = await supabase
            .from('coach_team_assignments')
            .select('id, user_id, team_id, season_id')
            .in('user_id', coachIds)
            .eq('season_id', seasonId)

        console.log('[getCoachesWithAssignments] Assignments query result:', {
            count: assignments?.length || 0,
            assignments: assignments?.map(a => ({ id: a.id, user_id: a.user_id, team_id: a.team_id })),
            error: assignmentsError
        })

        if (assignmentsError) {
            console.error('[getCoachesWithAssignments] Error fetching assignments:', assignmentsError)
            // Don't throw - continue with empty assignments
        }

        // 3. Get team names for assignments (separate query to avoid join issues)
        let teamNames: Record<string, string> = {}
        if (assignments && assignments.length > 0) {
            const teamIds = [...new Set(assignments.map(a => a.team_id))]
            console.log('[getCoachesWithAssignments] Fetching team names for IDs:', teamIds)

            const { data: teams, error: teamsError } = await supabase
                .from('teams')
                .select('id, name')
                .in('id', teamIds)

            console.log('[getCoachesWithAssignments] Teams query result:', {
                count: teams?.length || 0,
                teams: teams?.map(t => ({ id: t.id, name: t.name })),
                error: teamsError
            })

            if (!teamsError && teams) {
                teamNames = teams.reduce((acc, team) => {
                    acc[team.id] = team.name
                    return acc
                }, {} as Record<string, string>)
            }
        }

        // 4. Combine data
        const result = coaches.map(coach => ({
            id: coach.id,
            full_name: coach.full_name,
            email: '', // Email not available in profiles table
            role: coach.role || 'coach',
            assignments: (assignments || [])
                .filter(a => a.user_id === coach.id)
                .map(a => ({
                    id: a.id,
                    team_id: a.team_id,
                    team_name: teamNames[a.team_id] || 'Equipo desconocido',
                    season_id: a.season_id
                }))
        }))

        console.log('[getCoachesWithAssignments] Final result:', {
            totalCoaches: result.length,
            coachesWithAssignments: result.filter(c => c.assignments.length > 0).length,
            coachesWithoutAssignments: result.filter(c => c.assignments.length === 0).length
        })

        return result
    },

    /**
     * Get all teams assigned to a specific user (coach)
     * @param userId - The user's ID
     * @param seasonId - Optional season ID to filter by
     * @returns Array of team IDs assigned to the coach
     */
    getAssignedTeamsByUser: async (userId: string, seasonId?: string): Promise<string[]> => {
        let query = supabase
            .from('coach_team_assignments')
            .select('team_id')
            .eq('user_id', userId)

        if (seasonId) {
            query = query.eq('season_id', seasonId)
        }

        const { data, error } = await query

        if (error) {
            console.error('Error fetching coach assignments:', error)
            throw error
        }

        return data?.map(assignment => assignment.team_id) || []
    },

    /**
     * Get all assignments for a specific user
     * @param userId - The user's ID
     * @returns Array of full assignment records
     */
    getAssignmentsByUser: async (userId: string): Promise<CoachTeamAssignmentDB[]> => {
        const { data, error } = await supabase
            .from('coach_team_assignments')
            .select('*')
            .eq('user_id', userId)

        if (error) {
            console.error('Error fetching coach assignments:', error)
            throw error
        }

        return data || []
    },

    /**
     * Assign a coach to a team
     * @param params - Assignment parameters
     * @returns The created assignment record
     */
    assignCoachToTeam: async (params: {
        user_id: string
        team_id: string
        season_id: string
        role_in_team?: string
    }): Promise<CoachTeamAssignmentDB> => {
        const { data, error } = await supabase
            .from('coach_team_assignments')
            .insert(params)
            .select()
            .single()

        if (error) {
            console.error('Error creating coach assignment:', error)
            throw error
        }

        return data
    },

    /**
     * Remove a coach-team assignment
     * @param id - Assignment ID to delete
     */
    removeCoachAssignment: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('coach_team_assignments')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting coach assignment:', error)
            throw error
        }
    },

    // Legacy method names for backward compatibility
    createAssignment: async (params: {
        user_id: string
        team_id: string
        season_id: string
        role_in_team?: string
    }): Promise<CoachTeamAssignmentDB> => {
        return coachAssignmentService.assignCoachToTeam(params)
    },

    deleteAssignment: async (id: string): Promise<void> => {
        return coachAssignmentService.removeCoachAssignment(id)
    }
}
