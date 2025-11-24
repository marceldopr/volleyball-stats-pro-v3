import { supabase } from '@/lib/supabaseClient'

export interface PlayerTeamSeasonDB {
    id: string
    player_id: string
    team_id: string
    season_id: string
    jersey_number: string | null
    role: string | null
    expected_category: string | null
    current_category: string | null
    status: string | null
    notes: string | null
    created_at: string
    updated_at: string
}

export const playerTeamSeasonService = {
    getRosterByTeamAndSeason: async (teamId: string, seasonId: string): Promise<PlayerTeamSeasonDB[]> => {
        const { data, error } = await supabase
            .from('player_team_season')
            .select('*')
            .eq('team_id', teamId)
            .eq('season_id', seasonId)

        if (error) {
            console.error('Error fetching roster:', error)
            throw error
        }

        return data || []
    },

    addPlayerToTeamSeason: async (params: {
        player_id: string
        team_id: string
        season_id: string
        jersey_number?: string
        role?: string
        expected_category?: string
        current_category?: string
        status?: string
        notes?: string
    }): Promise<PlayerTeamSeasonDB> => {
        const { data, error } = await supabase
            .from('player_team_season')
            .insert(params)
            .select()
            .single()

        if (error) {
            console.error('Error adding player to team:', error)
            throw error
        }

        return data
    },

    updatePlayerInTeamSeason: async (id: string, data: Partial<PlayerTeamSeasonDB>): Promise<PlayerTeamSeasonDB> => {
        const { data: updatedRecord, error } = await supabase
            .from('player_team_season')
            .update({
                ...data,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating player in team:', error)
            throw error
        }

        return updatedRecord
    },

    removePlayerFromTeamSeason: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('player_team_season')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error removing player from team:', error)
            throw error
        }
    }
}
