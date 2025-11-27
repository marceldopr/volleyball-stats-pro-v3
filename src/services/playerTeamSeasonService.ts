import { supabase } from '@/lib/supabaseClient'

import { PlayerDB } from './playerService'

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
    player?: PlayerDB
}


export const playerTeamSeasonService = {
    getRosterByTeamAndSeason: async (teamId: string, seasonId: string): Promise<PlayerTeamSeasonDB[]> => {
        // 1. Fetch the roster links
        const { data: rosterData, error: rosterError } = await supabase
            .from('player_team_season')
            .select('*')
            .eq('team_id', teamId)
            .eq('season_id', seasonId)

        if (rosterError) {
            console.error('Error fetching roster links:', rosterError)
            throw rosterError
        }

        if (!rosterData || rosterData.length === 0) return []

        // 2. Extract player IDs
        const playerIds = rosterData.map(item => item.player_id)

        // 3. Fetch player details from club_players table
        const { data: playersData, error: playersError } = await supabase
            .from('club_players')
            .select('*')
            .in('id', playerIds)

        if (playersError) {
            console.error('Error fetching player details:', playersError)
            // Fallback: return roster without player details rather than failing completely
            return rosterData
        }

        // 4. Map player details to roster items
        const playersMap = new Map(playersData?.map(p => [p.id, p]))

        return rosterData.map(item => ({
            ...item,
            player: playersMap.get(item.player_id)
        }))
    },

    getPlayerTeamBySeason: async (playerId: string, seasonId: string): Promise<PlayerTeamSeasonDB | null> => {
        const { data, error } = await supabase
            .from('player_team_season')
            .select('*')
            .eq('player_id', playerId)
            .eq('season_id', seasonId)
            .single()

        if (error) {
            // Player might not be assigned to any team
            if (error.code === 'PGRST116') {
                return null
            }
            console.error('Error fetching player team assignment:', error)
            throw error
        }

        return data
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

    getPlayersByTeams: async (teamIds: string[], seasonId: string): Promise<PlayerDB[]> => {
        if (teamIds.length === 0) return []

        const { data, error } = await supabase
            .from('player_team_season')
            .select(`
                player_id,
                club_players (*)
            `)
            .in('team_id', teamIds)
            .eq('season_id', seasonId)

        if (error) {
            console.error('Error fetching players by teams:', error)
            throw error
        }

        // Extract unique players (a player might be in multiple teams)
        const playersMap = new Map<string, PlayerDB>()
        data?.forEach((item: any) => {
            if (item.club_players) {
                playersMap.set(item.club_players.id, item.club_players)
            }
        })

        return Array.from(playersMap.values())
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
