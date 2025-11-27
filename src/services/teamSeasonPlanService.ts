import { supabase } from '@/lib/supabaseClient'
import { TeamSeasonPlanDB } from '@/types/TeamSeasonPlan'

export const teamSeasonPlanService = {
    /**
     * Get team season plan by team and season
     */
    getPlanByTeamSeason: async (teamId: string, seasonId: string): Promise<TeamSeasonPlanDB | null> => {
        try {
            const { data, error } = await supabase
                .from('team_season_plan')
                .select('*')
                .eq('team_id', teamId)
                .eq('season_id', seasonId)
                .single()

            if (error) {
                if (error.code === 'PGRST116') return null // No rows found
                console.error('Error fetching team season plan:', error)
                throw error
            }

            return data
        } catch (error) {
            console.error('Error in getPlanByTeamSeason:', error)
            throw error
        }
    },

    /**
     * Upsert (create or update) team season plan
     */
    upsertPlan: async (
        plan: Omit<TeamSeasonPlanDB, 'id' | 'created_at' | 'updated_at'>
    ): Promise<TeamSeasonPlanDB> => {
        try {
            const { data, error } = await supabase
                .from('team_season_plan')
                .upsert(
                    {
                        ...plan,
                        updated_at: new Date().toISOString()
                    },
                    {
                        onConflict: 'team_id,season_id',
                        ignoreDuplicates: false
                    }
                )
                .select()
                .single()

            if (error) {
                console.error('Error upserting team season plan:', error)
                throw error
            }

            return data
        } catch (error) {
            console.error('Error in upsertPlan:', error)
            throw error
        }
    },

    /**
     * Get all plans for a club in a season
     */
    getPlansByClubSeason: async (clubId: string, seasonId: string): Promise<TeamSeasonPlanDB[]> => {
        try {
            const { data, error } = await supabase
                .from('team_season_plan')
                .select('*')
                .eq('club_id', clubId)
                .eq('season_id', seasonId)
                .order('updated_at', { ascending: false })

            if (error) {
                console.error('Error fetching club season plans:', error)
                throw error
            }

            return data || []
        } catch (error) {
            console.error('Error in getPlansByClubSeason:', error)
            throw error
        }
    },

    /**
     * Delete a team season plan
     */
    deletePlan: async (id: string): Promise<void> => {
        try {
            const { error } = await supabase
                .from('team_season_plan')
                .delete()
                .eq('id', id)

            if (error) {
                console.error('Error deleting team season plan:', error)
                throw error
            }
        } catch (error) {
            console.error('Error in deletePlan:', error)
            throw error
        }
    }
}
