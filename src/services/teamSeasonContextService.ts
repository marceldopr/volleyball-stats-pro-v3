import { supabase } from '@/lib/supabaseClient'

export interface TeamSeasonContextDB {
    id: string
    team_id: string
    season_id: string
    primary_goal: string | null
    secondary_goals: string[] | null
    training_focus: string[] | null
    role_hierarchy: string | null
    default_rotation_notes: string | null
    internal_rules: string[] | null
    staff_notes: string | null
    created_at: string
    updated_at: string
}

export interface TeamSeasonContextInput {
    team_id: string
    season_id: string
    primary_goal?: string
    secondary_goals?: string[]
    training_focus?: string[]
    role_hierarchy?: string
    default_rotation_notes?: string
    internal_rules?: string[]
    staff_notes?: string
}

export const teamSeasonContextService = {
    /**
     * Get context for a specific team and season
     */
    getContextByTeamAndSeason: async (teamId: string, seasonId: string): Promise<TeamSeasonContextDB | null> => {
        try {
            const { data, error } = await supabase
                .from('team_season_context')
                .select('*')
                .eq('team_id', teamId)
                .eq('season_id', seasonId)

            if (error) {
                console.error('Error fetching team season context:', error)
                throw error
            }

            if (!data || data.length === 0) {
                return null
            }

            // Return the first one if multiple exist (handling potential duplicates gracefully)
            return data[0]
        } catch (error) {
            console.error('Error in getContextByTeamAndSeason:', error)
            throw error
        }
    },

    /**
     * Create or update context (upsert)
     */
    upsertContext: async (data: TeamSeasonContextInput): Promise<TeamSeasonContextDB> => {
        try {
            const { data: result, error } = await supabase
                .from('team_season_context')
                .upsert({
                    team_id: data.team_id,
                    season_id: data.season_id,
                    primary_goal: data.primary_goal || null,
                    secondary_goals: data.secondary_goals || null,
                    training_focus: data.training_focus || null,
                    role_hierarchy: data.role_hierarchy || null,
                    default_rotation_notes: data.default_rotation_notes || null,
                    internal_rules: data.internal_rules || null,
                    staff_notes: data.staff_notes || null,
                }, {
                    onConflict: 'team_id,season_id'
                })
                .select()
                .single()

            if (error) {
                console.error('Error upserting team season context:', error)
                throw error
            }

            return result
        } catch (error) {
            console.error('Error in upsertContext:', error)
            throw error
        }
    },

    /**
     * Delete context
     */
    deleteContext: async (id: string): Promise<void> => {
        try {
            const { error } = await supabase
                .from('team_season_context')
                .delete()
                .eq('id', id)

            if (error) {
                console.error('Error deleting team season context:', error)
                throw error
            }
        } catch (error) {
            console.error('Error in deleteContext:', error)
            throw error
        }
    }
}
