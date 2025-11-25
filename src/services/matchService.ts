import { supabase } from '@/lib/supabaseClient'
import { Match, MatchPlayer, PlayerStats, Set } from '../stores/matchStore'

export interface MatchDB {
    id: string
    club_id: string
    season_id: string
    team_id: string
    opponent_name: string
    competition_name: string | null
    match_date: string
    location: string | null
    home_away: 'home' | 'away' | 'neutral' | string
    status: 'planned' | 'in_progress' | 'finished' | 'cancelled' | string
    result: string | null
    notes: string | null
    created_at: string
    updated_at: string
}

export const matchService = {
    /**
     * Get all matches for a club and season
     */
    getMatchesByClubAndSeason: async (clubId: string, seasonId: string): Promise<MatchDB[]> => {
        try {
            const { data, error } = await supabase
                .from('matches')
                .select('*')
                .eq('club_id', clubId)
                .eq('season_id', seasonId)
                .order('match_date', { ascending: false })

            if (error) {
                console.error('Error fetching matches:', error)
                throw error
            }

            return data || []
        } catch (error) {
            console.error('Error in getMatchesByClubAndSeason:', error)
            throw error
        }
    },

    /**
     * Get a single match by ID
     */
    getMatchById: async (id: string): Promise<MatchDB | null> => {
        try {
            const { data, error } = await supabase
                .from('matches')
                .select('*')
                .eq('id', id)
                .single()

            if (error) {
                if (error.code === 'PGRST116') {
                    // No rows returned
                    return null
                }
                console.error('Error fetching match:', error)
                throw error
            }

            return data
        } catch (error) {
            console.error('Error in getMatchById:', error)
            throw error
        }
    },

    /**
     * Get full match details including players and stats
     */
    getMatchFullDetails: async (id: string): Promise<Match | null> => {
        try {
            // 1. Get match metadata
            const { data: matchData, error: matchError } = await supabase
                .from('matches')
                .select('*')
                .eq('id', id)
                .single()

            if (matchError || !matchData) {
                console.error('Error fetching match details:', matchError)
                return null
            }

            // 2. Get players (convocations)
            const { data: convocationData, error: convocationError } = await supabase
                .from('match_convocations')
                .select(`
                    player_id,
                    role_in_match,
                    club_players (
                        id,
                        first_name,
                        last_name,
                        main_position
                    )
                `)
                .eq('match_id', id)
                .eq('status', 'convocado')

            if (convocationError) {
                console.error('Error fetching convocations:', convocationError)
            }

            // 3. Get jersey numbers from player_team_season
            const { data: rosterData } = await supabase
                .from('player_team_season')
                .select('player_id, jersey_number')
                .eq('team_id', matchData.team_id)
                .eq('season_id', matchData.season_id)

            const jerseyMap = (rosterData || []).reduce((acc, item) => {
                acc[item.player_id] = item.jersey_number
                return acc
            }, {} as Record<string, string>)

            // 4. Get stats
            const { data: statsData, error: statsError } = await supabase
                .from('match_player_set_stats')
                .select('*')
                .eq('match_id', id)

            if (statsError) {
                console.error('Error fetching stats:', statsError)
            }

            // 5. Transform to Match object
            const players: MatchPlayer[] = (convocationData || []).map((conv: any) => {
                const playerStats = (statsData || []).filter((s: any) => s.player_id === conv.player_id)

                // Aggregate stats
                const aggregatedStats: PlayerStats = {
                    serves: playerStats.reduce((sum: number, s: any) => sum + (s.serves || 0), 0),
                    aces: playerStats.reduce((sum: number, s: any) => sum + (s.aces || 0), 0),
                    serveErrors: playerStats.reduce((sum: number, s: any) => sum + (s.serve_errors || 0), 0),
                    receptions: playerStats.reduce((sum: number, s: any) => sum + (s.receptions || 0), 0),
                    receptionErrors: playerStats.reduce((sum: number, s: any) => sum + (s.reception_errors || 0), 0),
                    attacks: playerStats.reduce((sum: number, s: any) => sum + (s.attacks || 0), 0),
                    kills: playerStats.reduce((sum: number, s: any) => sum + (s.kills || 0), 0),
                    attackErrors: playerStats.reduce((sum: number, s: any) => sum + (s.attack_errors || 0), 0),
                    blocks: playerStats.reduce((sum: number, s: any) => sum + (s.blocks || 0), 0),
                    blockErrors: playerStats.reduce((sum: number, s: any) => sum + (s.block_errors || 0), 0),
                    digs: playerStats.reduce((sum: number, s: any) => sum + (s.digs || 0), 0),
                    digsErrors: playerStats.reduce((sum: number, s: any) => sum + (s.digs_errors || 0), 0),
                    sets: playerStats.reduce((sum: number, s: any) => sum + (s.sets || 0), 0),
                    setErrors: playerStats.reduce((sum: number, s: any) => sum + (s.set_errors || 0), 0),
                }

                return {
                    playerId: conv.player_id,
                    name: `${conv.club_players.first_name} ${conv.club_players.last_name}`,
                    number: parseInt(jerseyMap[conv.player_id] || '0'),
                    position: conv.role_in_match || conv.club_players.main_position || '?',
                    starter: false, // Cannot determine from current schema easily, would need starters table
                    stats: aggregatedStats
                }
            })

            // Reconstruct sets (basic info only as we don't store set scores yet)
            const maxSet = (statsData || []).reduce((max: number, s: any) => Math.max(max, s.set_number), 0)
            const sets: Set[] = []
            for (let i = 1; i <= maxSet; i++) {
                sets.push({
                    id: `set-${i}`,
                    number: i,
                    homeScore: 0, // Unknown
                    awayScore: 0, // Unknown
                    status: 'completed'
                })
            }

            // If no sets found but match is finished, try to parse result string?
            // "3-0" -> 3 sets.
            if (sets.length === 0 && matchData.result) {
                // Simple parsing for "3-0", "3-1", etc.
                const parts = matchData.result.split('-')
                if (parts.length === 2) {
                    const homeSets = parseInt(parts[0])
                    const awaySets = parseInt(parts[1])
                    const totalSets = homeSets + awaySets
                    for (let i = 1; i <= totalSets; i++) {
                        sets.push({
                            id: `set-${i}`,
                            number: i,
                            homeScore: 0,
                            awayScore: 0,
                            status: 'completed'
                        })
                    }
                }
            }

            return {
                id: matchData.id,
                dbMatchId: matchData.id,
                opponent: matchData.opponent_name,
                date: matchData.match_date,
                time: new Date(matchData.match_date).toLocaleTimeString(),
                location: matchData.location || '',
                status: matchData.status === 'planned' ? 'upcoming' : matchData.status === 'in_progress' ? 'live' : matchData.status === 'finished' ? 'completed' : 'upcoming',
                result: matchData.result || undefined,
                teamId: matchData.team_id,
                season_id: matchData.season_id,
                teamSide: matchData.home_away === 'home' ? 'local' : 'visitante',
                sets: sets,
                players: players,
                currentSet: maxSet || 1,
                setsWonLocal: 0, // Would need to parse result
                setsWonVisitor: 0, // Would need to parse result
                sacadorInicialSet1: null,
                acciones: [], // Not loading actions yet
                createdAt: matchData.created_at,
                updatedAt: matchData.updated_at
            }

        } catch (error) {
            console.error('Error in getMatchFullDetails:', error)
            return null
        }
    },

    /**
     * Create a new match
     */
    createMatch: async (data: {
        club_id: string
        season_id: string
        team_id: string
        opponent_name: string
        match_date: string
        location?: string
        home_away?: 'home' | 'away' | 'neutral'
        competition_name?: string
        status?: 'planned' | 'in_progress' | 'finished' | 'cancelled'
        notes?: string
    }): Promise<MatchDB> => {
        try {
            // Apply defaults
            const matchData = {
                ...data,
                home_away: data.home_away || 'home',
                status: data.status || 'planned',
                location: data.location || null,
                competition_name: data.competition_name || null,
                notes: data.notes || null
            }

            const { data: newMatch, error } = await supabase
                .from('matches')
                .insert([matchData])
                .select()
                .single()

            if (error) {
                console.error('Error creating match:', error)
                throw error
            }

            return newMatch
        } catch (error) {
            console.error('Error in createMatch:', error)
            throw error
        }
    },

    /**
     * Update an existing match
     */
    updateMatch: async (id: string, data: Partial<MatchDB>): Promise<MatchDB> => {
        try {
            // Remove read-only fields
            const { id: _, created_at, updated_at, ...updateData } = data as any

            const { data: updatedMatch, error } = await supabase
                .from('matches')
                .update(updateData)
                .eq('id', id)
                .select()
                .single()

            if (error) {
                console.error('Error updating match:', error)
                throw error
            }

            return updatedMatch
        } catch (error) {
            console.error('Error in updateMatch:', error)
            throw error
        }
    },

    /**
     * Delete a match
     */
    deleteMatch: async (id: string): Promise<void> => {
        try {
            const { error } = await supabase
                .from('matches')
                .delete()
                .eq('id', id)

            if (error) {
                console.error('Error deleting match:', error)
                throw error
            }
        } catch (error) {
            console.error('Error in deleteMatch:', error)
            throw error
        }
    }
}
