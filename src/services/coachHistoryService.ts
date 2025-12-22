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
        const { data, error } = await supabase
            .from('coach_team_season')
            .select(`
        *,
        teams(id, custom_name, category, gender, identifier),
        seasons(id, name)
      `)
            .eq('coach_id', coachId)
            .order('date_from', { ascending: false })

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
            season.teams.push({
                team_id: assignment.team_id,
                team_name: assignment.teams?.custom_name ||
                    `${assignment.teams?.category || ''} ${assignment.teams?.gender || ''}`.trim(),
                role_in_team: assignment.role_in_team,
                date_from: assignment.date_from,
                date_to: assignment.date_to
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
        const { data, error } = await supabase
            .from('coach_team_season')
            .select('*')
            .eq('coach_id', coachId)
            .eq('season_id', seasonId)

        if (error) {
            console.error('Error fetching coach teams by season:', error)
            throw error
        }

        return data || []
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
            .from('coach_team_season')
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
            .from('coach_team_season')
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
            .from('coach_team_season')
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
