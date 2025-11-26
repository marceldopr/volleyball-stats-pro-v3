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
        // 1. Get all coaches from the club
        const { data: coaches, error: coachesError } = await supabase
            .from('profiles')
            .select('id, full_name, email, role')
            .eq('club_id', clubId)
            .eq('role', 'coach')

        if (coachesError) {
            console.error('Error fetching coaches:', coachesError)
            throw coachesError
        }

        if (!coaches || coaches.length === 0) {
            return []
        }

        // 2. Get all assignments for these coaches in the current season
        const coachIds = coaches.map(c => c.id)
        const { data: assignments, error: assignmentsError } = await supabase
            .from('coach_team_assignments')
            .select(`
                id,
                user_id,
                team_id,
                season_id,
                teams:team_id (
                    name
                )
            `)
            .in('user_id', coachIds)
            .eq('season_id', seasonId)

        if (assignmentsError) {
            console.error('Error fetching assignments:', assignmentsError)
            throw assignmentsError
        }

        // 3. Combine data
        return coaches.map(coach => ({
            id: coach.id,
            full_name: coach.full_name,
            email: coach.email || '',
            role: coach.role || 'coach',
            assignments: (assignments || [])
                .filter(a => a.user_id === coach.id)
                .map(a => ({
                    id: a.id,
                    team_id: a.team_id,
                    team_name: (a.teams as any)?.name || 'Equipo desconocido',
                    season_id: a.season_id
                }))
        }))
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

