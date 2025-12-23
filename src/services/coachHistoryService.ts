import { supabase } from '@/lib/supabaseClient'
import type {
    CoachTeamSeasonDB,
    CreateCoachTeamSeasonParams,
    CoachSeasonHistory
} from '@/types/Coach'

export const coachHistoryService = {
    /**
     * Get all team assignments for a coach across all seasons
     */
    getCoachHistory: async (coachId: string): Promise<CoachSeasonHistory[]> => {
        // First, get the coach's profile_id
        const { data: coach, error: coachError } = await supabase
            .from('coaches')
            .select('profile_id')
            .eq('id', coachId)
            .single()

        if (coachError) {
            console.error('Error fetching coach:', coachError)
            throw coachError
        }

        if (!coach?.profile_id) {
            console.warn('Coach has no profile_id:', coachId)
            return []
        }

        // Get assignments from the correct table
        const { data, error } = await supabase
            .from('coach_team_assignments')
            .select(`
        *,
        teams(id, custom_name, category, gender),
        seasons(id, name)
      `)
            .eq('user_id', coach.profile_id)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching coach history:', error)
            throw error
        }

        if (!data) return []

        // Group by season
        const seasonMap = new Map<string, CoachSeasonHistory>()

        data.forEach((assignment: any) => {
            const seasonId = assignment.season_id
            const seasonName = assignment.seasons?.name || 'Temporada desconocida'

            if (!seasonMap.has(seasonId)) {
                seasonMap.set(seasonId, {
                    season_id: seasonId,
                    season_name: seasonName,
                    teams: []
                })
            }

            const season = seasonMap.get(seasonId)!
            const genderLabel = assignment.teams?.gender === 'male' ? 'Masculino' : assignment.teams?.gender === 'female' ? 'Femenino' : assignment.teams?.gender || ''
            season.teams.push({
                team_id: assignment.team_id,
                team_name: assignment.teams?.custom_name ||
                    `${assignment.teams?.category || ''} ${genderLabel}`.trim(),
                role_in_team: assignment.role_in_team,
                date_from: assignment.date_from || null,
                date_to: assignment.date_to || null
            })
        })

        return Array.from(seasonMap.values())
    },

    /**
     * Get team assignments for a specific coach in a specific season
     */
    getCoachTeamsBySeason: async (
        coachId: string,
        seasonId: string
    ): Promise<CoachTeamSeasonDB[]> => {
        // First, get the coach's profile_id
        const { data: coach, error: coachError } = await supabase
            .from('coaches')
            .select('profile_id')
            .eq('id', coachId)
            .single()

        if (coachError) {
            console.error('Error fetching coach:', coachError)
            throw coachError
        }

        if (!coach?.profile_id) {
            console.warn('Coach has no profile_id:', coachId)
            return []
        }

        // Then get assignments from the correct table
        const { data, error } = await supabase
            .from('coach_team_assignments')
            .select('*')
            .eq('user_id', coach.profile_id)
            .eq('season_id', seasonId)

        if (error) {
            console.error('Error fetching coach teams by season:', error)
            throw error
        }

        // Map to the expected format
        return (data || []).map(assignment => ({
            id: assignment.id,
            coach_id: coachId, // Keep for compatibility
            team_id: assignment.team_id,
            season_id: assignment.season_id,
            role_in_team: assignment.role_in_team || 'other',
            start_date: null,
            end_date: null,
            date_from: null,
            date_to: null,
            created_at: assignment.created_at
        }))
    },

    /**
     * Add a coach to a team for a specific season
     */
    addCoachToTeamSeason: async (
        params: CreateCoachTeamSeasonParams
    ): Promise<CoachTeamSeasonDB> => {
        const { data, error } = await supabase
            .from('coach_team_season')
            .insert({
                ...params,
                role_in_team: params.role_in_team || 'head'
            })
            .select()
            .single()

        if (error) {
            console.error('Error adding coach to team:', error)
            throw error
        }

        return data
    },

    /**
     * Update a coach's role in a team
     */
    updateCoachTeamRole: async (
        assignmentId: string,
        role: 'head' | 'assistant' | 'pf' | 'other'
    ): Promise<CoachTeamSeasonDB> => {
        const { data, error } = await supabase
            .from('coach_team_assignments')
            .update({ role_in_team: role })
            .eq('id', assignmentId)
            .select()
            .single()

        if (error) {
            console.error('Error updating coach team role:', error)
            throw error
        }

        return data
    },

    /**
     * Remove a coach from a team/season
     */
    removeCoachFromTeamSeason: async (assignmentId: string): Promise<void> => {
        const { error } = await supabase
            .from('coach_team_assignments')
            .delete()
            .eq('id', assignmentId)

        if (error) {
            console.error('Error removing coach from team:', error)
            throw error
        }
    },

    /**
     * Update date range for an assignment
     */
    updateCoachTeamDates: async (
        assignmentId: string,
        dateFrom: string | null,
        dateTo: string | null
    ): Promise<CoachTeamSeasonDB> => {
        const { data, error } = await supabase
            .from('coach_team_assignments')
            .update({
                date_from: dateFrom,
                date_to: dateTo
            })
            .eq('id', assignmentId)
            .select()
            .single()

        if (error) {
            console.error('Error updating coach team dates:', error)
            throw error
        }

        return data
    }
}
