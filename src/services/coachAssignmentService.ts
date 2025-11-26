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

export const coachAssignmentService = {
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
     * Create a new coach-team assignment
     * @param params - Assignment parameters
     * @returns The created assignment record
     */
    createAssignment: async (params: {
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
     * Delete a coach-team assignment
     * @param id - Assignment ID to delete
     */
    deleteAssignment: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('coach_team_assignments')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting coach assignment:', error)
            throw error
        }
    }
}
