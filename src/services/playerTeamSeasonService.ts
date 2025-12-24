import { supabase } from '@/lib/supabaseClient'

import { PlayerDB } from './playerService'

export interface PlayerTeamSeasonDB {
    id: string
    player_id: string
    team_id: string
    season_id: string
    jersey_number: string | null
    role: string | null
    position: string | null // Season-specific position specific
    expected_category: string | null
    current_category: string | null
    status: string | null
    has_injury: boolean | null
    notes: string | null
    created_at: string
    updated_at: string
    player?: PlayerDB
    // NEW: Assignment Type
    assignment_type?: 'primary' | 'secondary'
    secondary_id?: string // ID from player_secondary_assignments if applicable
}


export const playerTeamSeasonService = {
    // UPDATED: Now fetches PRIMARY + SECONDARY assignments
    getRosterByTeamAndSeason: async (teamId: string, seasonId: string): Promise<PlayerTeamSeasonDB[]> => {
        // 1. Fetch PRIMARY roster
        const { data: primaryData, error: primaryError } = await supabase
            .from('player_team_season')
            .select(`
                *,
                player:club_players(*)
            `)
            .eq('team_id', teamId)
            .eq('season_id', seasonId)

        if (primaryError) throw primaryError

        // 2. Fetch SECONDARY roster (Doubling)
        const { data: secondaryData, error: secondaryError } = await supabase
            .from('player_secondary_assignments')
            .select(`
                *,
                player:club_players(*)
            `)
            .eq('team_id', teamId)
            .eq('season_id', seasonId)

        // Note: We ignore secondary errors or treat as empty to avoid blocking
        if (secondaryError) console.error('Error fetching secondary assignments:', secondaryError)

        const primaries = (primaryData || []).map((item: any) => ({
            ...item,
            assignment_type: 'primary' as const
        }))

        const secondaries = (secondaryData || []).map((item: any) => ({
            // Map secondary structure to PlayerTeamSeasonDB structure
            id: item.id, // This ID is from secondary table, OK for display
            player_id: item.player_id,
            team_id: item.team_id,
            season_id: item.season_id,
            jersey_number: item.jersey_number,
            role: null,
            position: null,
            expected_category: null,
            current_category: null,
            status: 'active', // Assume active if assignment exists
            has_injury: false,
            notes: item.notes,
            created_at: item.created_at,
            updated_at: item.updated_at,
            assignment_type: 'secondary' as const,
            secondary_id: item.id,
            player: item.player // Include joined player data
        }))

        // Return merged list - player data already included from joins
        return [...primaries, ...secondaries]
    },

    // UPDATED: Also fetching PRIMARY + SECONDARY for Active Roster
    getActiveRosterByTeamAndSeason: async (teamId: string, seasonId: string): Promise<PlayerTeamSeasonDB[]> => {
        // 1. Fetch PRIMARY roster (Active only)
        const { data: primaryData, error: primaryError } = await supabase
            .from('player_team_season')
            .select('*')
            .eq('team_id', teamId)
            .eq('season_id', seasonId)
            .eq('status', 'active')

        if (primaryError) throw primaryError

        // 2. Fetch SECONDARY roster (Doubling)
        // Check dates for validity
        const today = new Date().toISOString().split('T')[0]
        const { data: secondaryData, error: secondaryError } = await supabase
            .from('player_secondary_assignments')
            .select('*')
            .eq('team_id', teamId)
            .eq('season_id', seasonId)
        // Ideally filter by dates in SQL, but for now simple fetch

        if (secondaryError) console.error('Error fetching secondary assignments:', secondaryError)

        const primaries = (primaryData || []).map((item: any) => ({
            ...item,
            assignment_type: 'primary' as const
        }))

        // Filter valid secondaries
        const validSecondaries = (secondaryData || []).filter((item: any) => {
            if (item.valid_from && item.valid_from > today) return false
            if (item.valid_to && item.valid_to < today) return false
            return true
        })

        // For secondary assignments, fetch their primary team's category
        const secondaryPlayerIds = validSecondaries.map(s => s.player_id)
        let primaryTeamsMap = new Map<string, any>()

        if (secondaryPlayerIds.length > 0) {
            const { data: primaryTeams } = await supabase
                .from('player_team_season')
                .select('player_id, team_id, jersey_number, position, teams(category_stage, category)')
                .eq('season_id', seasonId)
                .in('player_id', secondaryPlayerIds)
                .eq('status', 'active')
                .neq('team_id', teamId) // Exclude current team

            if (primaryTeams) {
                primaryTeams.forEach((pt: any) => {
                    primaryTeamsMap.set(pt.player_id, {
                        teams: pt.teams,
                        jersey_number: pt.jersey_number,
                        position: pt.position
                    })
                })
            }
        }

        const mappedSecondaries = validSecondaries.map((item: any) => {
            const primaryInfo = primaryTeamsMap.get(item.player_id)
            const originCategory = primaryInfo?.teams?.category_stage || primaryInfo?.teams?.category || null
            // Use jersey number from secondary assignment, fallback to primary team's number
            const jerseyNumber = item.jersey_number || primaryInfo?.jersey_number || null
            // Use position from origin team (since secondary assignment usually doesn't have position override)
            const position = primaryInfo?.position || null

            return {
                id: item.id,
                player_id: item.player_id,
                team_id: item.team_id,
                season_id: item.season_id,
                jersey_number: jerseyNumber,
                role: null,
                position,
                expected_category: null,
                current_category: originCategory, // Store origin category here
                status: 'active',
                has_injury: false,
                notes: item.notes,
                created_at: item.created_at,
                updated_at: item.updated_at,
                assignment_type: 'secondary' as const,
                secondary_id: item.id
            }
        })

        const allRoster = [...primaries, ...mappedSecondaries]
        if (allRoster.length === 0) return []

        const playerIds = allRoster.map(item => item.player_id)

        const { data: playersData, error: playersError } = await supabase
            .from('club_players')
            .select('*')
            .in('id', playerIds)

        if (playersError) {
            console.error('Error fetching player details:', playersError)
            return allRoster
        }

        const playersMap = new Map(playersData?.map(p => [p.id, p]))

        return allRoster.map(item => ({
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
        position?: string
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
    },

    // Get all player assignments for a club in a specific season (with team info)
    getPlayerAssignmentsBySeasonWithTeams: async (seasonId: string): Promise<(PlayerTeamSeasonDB & { team?: { id: string, category_stage: string, gender: string, custom_name: string | null, identifier_id: string | null, identifier?: { name: string, type: 'letter' | 'color', code: string | null } | null } })[]> => {
        const { data, error } = await supabase
            .from('player_team_season')
            .select(`
                *,
                team:teams (
                    id, 
                    category_stage, 
                    gender, 
                    custom_name,
                    identifier_id,
                    identifier:club_identifiers (
                        name,
                        type,
                        code
                    )
                ),
                player:club_players (*)
            `)
            .eq('season_id', seasonId)

        if (error) {
            console.error('Error fetching player assignments:', error)
            throw error
        }

        return data || []
    },

    // Bulk upsert player assignments for a season
    bulkUpsertAssignments: async (assignments: Array<{
        player_id: string
        team_id: string
        season_id: string
        status?: string
        notes?: string
    }>): Promise<void> => {
        if (assignments.length === 0) return

        const { error } = await supabase
            .from('player_team_season')
            .upsert(assignments, { onConflict: 'player_id,season_id' })

        if (error) {
            console.error('Error bulk upserting assignments:', error)
            throw error
        }
    },

    // NEW: Secondary Assignment Management
    addSecondaryAssignment: async (params: {
        player_id: string
        team_id: string
        season_id: string
        club_id: string
        jersey_number?: string
        notes?: string
    }): Promise<void> => {
        const { error } = await supabase
            .from('player_secondary_assignments')
            .insert({
                player_id: params.player_id,
                team_id: params.team_id,
                season_id: params.season_id,
                club_id: params.club_id,
                jersey_number: params.jersey_number,
                notes: params.notes
            })

        if (error) {
            console.error('Error adding secondary assignment:', error)
            throw error
        }
    },

    removeSecondaryAssignment: async (secondaryId: string): Promise<void> => {
        const { error } = await supabase
            .from('player_secondary_assignments')
            .delete()
            .eq('id', secondaryId)

        if (error) {
            console.error('Error removing secondary assignment:', error)
            throw error
        }
    },

    updatePlayerInjuryStatus: async (
        playerId: string,
        seasonId: string,
        hasInjury: boolean
    ): Promise<void> => {
        // Find player_team_season record for this player in this season
        const { data: pts, error: fetchError } = await supabase
            .from('player_team_season')
            .select('id')
            .eq('player_id', playerId)
            .eq('season_id', seasonId)
            .limit(1)
            .single()

        if (fetchError || !pts) {
            throw new Error('Player not assigned to any team in this season')
        }

        // Update has_injury field
        const { error } = await supabase
            .from('player_team_season')
            .update({ has_injury: hasInjury })
            .eq('id', pts.id)

        if (error) throw error
    },

    // Get primary team assignments for given player IDs
    getPrimaryAssignmentsByPlayerIds: async (playerIds: string[], seasonId: string) => {
        const { data, error } = await supabase
            .from('player_team_season')
            .select('player_id, jersey_number, position')
            .in('player_id', playerIds)
            .eq('season_id', seasonId)

        if (error) {
            console.error('Error fetching primary assignments:', error)
            return { data: null, error }
        }

        return { data, error: null }
    }
}
