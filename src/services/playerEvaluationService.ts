import { supabase } from '@/lib/supabaseClient'

export interface PlayerEvaluationDB {
    id: string
    player_id: string
    team_id: string
    season_id: string
    evaluation_type: 'start' | 'mid' | 'end'
    level_overall?: 'below' | 'in_line' | 'above'
    tech_comment?: string
    tactic_comment?: string
    physical_comment?: string
    mental_comment?: string
    role_in_team?: 'key_player' | 'rotation' | 'development'
    coach_recommendation?: string
    created_by?: string
    created_at: string
    updated_at: string
}

export interface PlayerEvaluationInput {
    player_id: string
    team_id: string
    season_id: string
    evaluation_type: 'start' | 'mid' | 'end'
    level_overall?: 'below' | 'in_line' | 'above'
    tech_comment?: string
    tactic_comment?: string
    physical_comment?: string
    mental_comment?: string
    role_in_team?: 'key_player' | 'rotation' | 'development'
    coach_recommendation?: string
}

export const playerEvaluationService = {
    /**
     * Get all evaluations for a team's roster in a specific season
     */
    getEvaluationsByTeamSeason: async (teamId: string, seasonId: string): Promise<PlayerEvaluationDB[]> => {
        const { data, error } = await supabase
            .from('player_team_season_evaluations')
            .select('*')
            .eq('team_id', teamId)
            .eq('season_id', seasonId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[playerEvaluationService] Error fetching evaluations:', error)
            throw error
        }

        return data || []
    },

    /**
     * Get a specific evaluation for a player
     */
    getPlayerEvaluation: async (
        playerId: string,
        teamId: string,
        seasonId: string,
        evaluationType: 'start' | 'mid' | 'end'
    ): Promise<PlayerEvaluationDB | null> => {
        const { data, error } = await supabase
            .from('player_team_season_evaluations')
            .select('*')
            .eq('player_id', playerId)
            .eq('team_id', teamId)
            .eq('season_id', seasonId)
            .eq('evaluation_type', evaluationType)
            .maybeSingle()

        if (error) {
            console.error('[playerEvaluationService] Error fetching evaluation:', error)
            throw error
        }

        return data
    },

    /**
     * Get all evaluations for a specific player across all teams/seasons
     */
    getPlayerEvaluationHistory: async (playerId: string): Promise<PlayerEvaluationDB[]> => {
        const { data, error } = await supabase
            .from('player_team_season_evaluations')
            .select(`
                *,
                teams:team_id(name),
                seasons:season_id(name)
            `)
            .eq('player_id', playerId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[playerEvaluationService] Error fetching player history:', error)
            throw error
        }

        return data || []
    },

    /**
     * Create or update an evaluation (upsert)
     */
    upsertEvaluation: async (evaluation: PlayerEvaluationInput): Promise<PlayerEvaluationDB> => {
        const { data: { user } } = await supabase.auth.getUser()

        const evaluationData = {
            ...evaluation,
            created_by: user?.id
        }

        const { data, error } = await supabase
            .from('player_team_season_evaluations')
            .upsert(evaluationData, {
                onConflict: 'player_id,team_id,season_id,evaluation_type'
            })
            .select()
            .single()

        if (error) {
            console.error('[playerEvaluationService] Error upserting evaluation:', error)
            throw error
        }

        return data
    },

    /**
     * Delete an evaluation (DT only)
     */
    deleteEvaluation: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('player_team_season_evaluations')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('[playerEvaluationService] Error deleting evaluation:', error)
            throw error
        }
    },

    /**
     * Get evaluation statistics for a team/season
     */
    getEvaluationStats: async (teamId: string, seasonId: string): Promise<{
        total_players: number
        start_completed: number
        mid_completed: number
        end_completed: number
    }> => {
        // Get total players in roster
        const { count: totalPlayers } = await supabase
            .from('team_rosters')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', teamId)
            .eq('season_id', seasonId)

        // Get evaluation counts by type
        const { data: evaluations } = await supabase
            .from('player_team_season_evaluations')
            .select('evaluation_type')
            .eq('team_id', teamId)
            .eq('season_id', seasonId)

        const startCompleted = evaluations?.filter((e: { evaluation_type: string }) => e.evaluation_type === 'start').length || 0
        const midCompleted = evaluations?.filter((e: { evaluation_type: string }) => e.evaluation_type === 'mid').length || 0
        const endCompleted = evaluations?.filter((e: { evaluation_type: string }) => e.evaluation_type === 'end').length || 0

        return {
            total_players: totalPlayers || 0,
            start_completed: startCompleted,
            mid_completed: midCompleted,
            end_completed: endCompleted
        }
    }
}
