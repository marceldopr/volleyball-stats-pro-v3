import { supabase } from '@/lib/supabaseClient'
import type {
    CoachDB,
    CreateCoachParams,
    UpdateCoachParams,
    CoachWithTeams
} from '@/types/Coach'

export const coachService = {
    /**
     * Get all coaches for a specific club
     */
    getCoachesByClub: async (clubId: string): Promise<CoachDB[]> => {
        const { data, error } = await supabase
            .from('coaches')
            .select('*')
            .eq('club_id', clubId)
            .eq('approval_status', 'approved')
            .order('last_name', { ascending: true })

        if (error) {
            console.error('Error fetching coaches:', error)
            throw error
        }

        return data || []
    },

    /**
     * Get a single coach by ID
     */
    getCoachById: async (coachId: string): Promise<CoachDB | null> => {
        const { data, error } = await supabase
            .from('coaches')
            .select('*')
            .eq('id', coachId)
            .single()

        if (error) {
            console.error('Error fetching coach:', error)
            throw error
        }

        return data
    },

    getCoachesWithCurrentTeams: async (
        clubId: string,
        seasonId: string
    ): Promise<CoachWithTeams[]> => {
        // Get all approved coaches
        const coaches = await coachService.getCoachesByClub(clubId)

        // Get team assignments for current season from the correct table
        const { data: assignments, error: assignmentsError } = await supabase
            .from('coach_team_assignments')
            .select('id, user_id, team_id, role_in_team, teams(id, custom_name, category, gender)')
            .eq('season_id', seasonId)

        if (assignmentsError) {
            console.error('Error fetching assignments:', assignmentsError)
            // Continue without assignments
        }

        // Combine data - match by profile_id (user_id in assignments)
        return coaches.map(coach => ({
            ...coach,
            current_teams: (assignments || [])
                .filter(a => a.user_id === coach.profile_id)
                .map(a => {
                    const team = Array.isArray(a.teams) ? a.teams[0] : a.teams
                    const genderLabel = team?.gender === 'male' ? 'Masculino' : team?.gender === 'female' ? 'Femenino' : team?.gender || ''
                    return {
                        id: a.id,
                        team_id: a.team_id,
                        team_name: team?.custom_name || `${team?.category || ''} ${genderLabel}`.trim(),
                        role_in_team: a.role_in_team
                    }
                })
        }))
    },

    /**
     * Create a new coach
     */
    createCoach: async (params: CreateCoachParams): Promise<CoachDB> => {
        const { data, error } = await supabase
            .from('coaches')
            .insert({
                ...params,
                status: params.status || 'active'
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating coach:', error)
            throw error
        }

        return data
    },

    /**
     * Update an existing coach
     */
    updateCoach: async (
        coachId: string,
        params: UpdateCoachParams
    ): Promise<CoachDB> => {
        const { data, error } = await supabase
            .from('coaches')
            .update({
                ...params,
                updated_at: new Date().toISOString()
            })
            .eq('id', coachId)
            .select()
            .single()

        if (error) {
            console.error('Error updating coach:', error)
            throw error
        }

        return data
    },

    /**
     * Toggle coach status (active/inactive)
     */
    toggleCoachStatus: async (coachId: string): Promise<CoachDB> => {
        // Get current status
        const coach = await coachService.getCoachById(coachId)
        if (!coach) throw new Error('Coach not found')

        const newStatus = coach.status === 'active' ? 'inactive' : 'active'

        return coachService.updateCoach(coachId, { status: newStatus })
    },

    /**
     * Delete a coach (soft delete by setting inactive, or hard delete)
     */
    deleteCoach: async (coachId: string): Promise<void> => {
        const { error } = await supabase
            .from('coaches')
            .delete()
            .eq('id', coachId)

        if (error) {
            console.error('Error deleting coach:', error)
            throw error
        }
    },

    /**
     * Get coach by profile_id (for linking user accounts)
     */
    getCoachByProfileId: async (profileId: string): Promise<CoachDB | null> => {
        const { data, error } = await supabase
            .from('coaches')
            .select('*')
            .eq('profile_id', profileId)
            .single()

        if (error) {
            // Not found is not an error
            if (error.code === 'PGRST116') return null
            console.error('Error fetching coach by profile:', error)
            throw error
        }

        return data
    },

    /**
     * Approve a coach (DT only)
     */
    approveCoach: async (coachId: string): Promise<CoachDB> => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { data, error } = await supabase
            .from('coaches')
            .update({
                approval_status: 'approved',
                approved_at: new Date().toISOString(),
                approved_by_profile_id: user.id
            })
            .eq('id', coachId)
            .select()
            .single()

        if (error) {
            console.error('Error approving coach:', error)
            throw error
        }

        return data
    },

    /**
     * Reject a coach (DT only)
     */
    rejectCoach: async (coachId: string): Promise<CoachDB> => {
        const { data, error } = await supabase
            .from('coaches')
            .update({ approval_status: 'rejected' })
            .eq('id', coachId)
            .select()
            .single()

        if (error) {
            console.error('Error rejecting coach:', error)
            throw error
        }

        return data
    },

    /**
     * Get pending coaches for approval
     */
    getPendingCoaches: async (clubId: string): Promise<CoachDB[]> => {
        const { data, error } = await supabase
            .from('coaches')
            .select('*')
            .eq('club_id', clubId)
            .eq('approval_status', 'pending')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching pending coaches:', error)
            throw error
        }

        return data || []
    }
}
