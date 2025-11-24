import { supabase } from '@/lib/supabaseClient'

export interface MatchPlayerSetStatsDB {
    id: string
    match_id: string
    player_id: string
    team_id: string
    season_id: string
    set_number: number

    // Stats columns (matching PlayerStats interface)
    serves: number
    aces: number
    serve_errors: number

    receptions: number
    reception_errors: number

    attacks: number
    kills: number
    attack_errors: number

    blocks: number
    block_errors: number

    digs: number
    digs_errors: number

    sets: number
    set_errors: number

    notes: string | null
    created_at: string
    updated_at: string
}

export const matchStatsService = {
    /**
     * Get all stats for a specific match (all sets, all players)
     */
    getStatsByMatch: async (matchId: string): Promise<MatchPlayerSetStatsDB[]> => {
        try {
            const { data, error } = await supabase
                .from('match_player_set_stats')
                .select('*')
                .eq('match_id', matchId)
                .order('set_number', { ascending: true })

            if (error) {
                console.error('Error fetching match stats:', error)
                throw error
            }

            return data || []
        } catch (error) {
            console.error('Error in getStatsByMatch:', error)
            throw error
        }
    },

    /**
     * Get stats for a specific player in a match
     */
    getStatsByMatchAndPlayer: async (matchId: string, playerId: string): Promise<MatchPlayerSetStatsDB[]> => {
        try {
            const { data, error } = await supabase
                .from('match_player_set_stats')
                .select('*')
                .eq('match_id', matchId)
                .eq('player_id', playerId)
                .order('set_number', { ascending: true })

            if (error) {
                console.error('Error fetching player match stats:', error)
                throw error
            }

            return data || []
        } catch (error) {
            console.error('Error in getStatsByMatchAndPlayer:', error)
            throw error
        }
    },

    /**
     * Insert or update stats for a player in a specific set
     */
    upsertStatsForMatchPlayerSet: async (params: {
        match_id: string
        player_id: string
        team_id: string
        season_id: string
        set_number: number
        serves?: number
        aces?: number
        serve_errors?: number
        receptions?: number
        reception_errors?: number
        attacks?: number
        kills?: number
        attack_errors?: number
        blocks?: number
        block_errors?: number
        digs?: number
        digs_errors?: number
        sets?: number
        set_errors?: number
        notes?: string
    }): Promise<MatchPlayerSetStatsDB> => {
        try {
            const { data, error } = await supabase
                .from('match_player_set_stats')
                .upsert(
                    {
                        match_id: params.match_id,
                        player_id: params.player_id,
                        team_id: params.team_id,
                        season_id: params.season_id,
                        set_number: params.set_number,
                        serves: params.serves ?? 0,
                        aces: params.aces ?? 0,
                        serve_errors: params.serve_errors ?? 0,
                        receptions: params.receptions ?? 0,
                        reception_errors: params.reception_errors ?? 0,
                        attacks: params.attacks ?? 0,
                        kills: params.kills ?? 0,
                        attack_errors: params.attack_errors ?? 0,
                        blocks: params.blocks ?? 0,
                        block_errors: params.block_errors ?? 0,
                        digs: params.digs ?? 0,
                        digs_errors: params.digs_errors ?? 0,
                        sets: params.sets ?? 0,
                        set_errors: params.set_errors ?? 0,
                        notes: params.notes ?? null
                    },
                    {
                        onConflict: 'match_id,player_id,set_number'
                    }
                )
                .select()
                .single()

            if (error) {
                console.error('Error upserting match stats:', error)
                throw error
            }

            return data
        } catch (error) {
            console.error('Error in upsertStatsForMatchPlayerSet:', error)
            throw error
        }
    },

    /**
     * Delete all stats for a match (cleanup)
     */
    deleteStatsForMatch: async (matchId: string): Promise<void> => {
        try {
            const { error } = await supabase
                .from('match_player_set_stats')
                .delete()
                .eq('match_id', matchId)

            if (error) {
                console.error('Error deleting match stats:', error)
                throw error
            }
        } catch (error) {
            console.error('Error in deleteStatsForMatch:', error)
            throw error
        }
    }
}
