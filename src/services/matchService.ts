import { supabase } from '@/lib/supabaseClient'

// Types defined locally (previously from matchStore which is now V2-only)
export interface PlayerStats {
    serves: number
    aces: number
    serveErrors: number
    receptions: number
    receptionErrors: number
    attacks: number
    kills: number
    attackErrors: number
    blocks: number
    blockErrors: number
    digs: number
    digsErrors: number
    sets: number
    setErrors: number
}

export interface MatchPlayer {
    playerId: string
    name: string
    number: number
    position: string
    starter: boolean
    stats: PlayerStats
}

export interface Set {
    id: string
    number: number
    homeScore: number
    awayScore: number
    status: 'in_progress' | 'completed'
}

export interface Match {
    id: string
    dbMatchId?: string
    opponent: string
    date: string
    time: string
    location: string
    status: 'upcoming' | 'live' | 'completed'
    result?: string
    teamId?: string
    season_id?: string
    teamSide: 'local' | 'visitante'
    sets: Set[]
    players: MatchPlayer[]
    currentSet: number
    setsWonLocal: number
    setsWonVisitor: number
    sacadorInicialSet1?: 'local' | 'visitor' | null
    sacadorInicialSet5?: 'local' | 'visitor' | null
    acciones: any[]
    createdAt?: string
    updatedAt?: string
}

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
    actions: any[] | null
    created_at: string
    updated_at: string
    sacador_inicial_set_1?: 'local' | 'visitor' | null
    sacador_inicial_set_5?: 'local' | 'visitor' | null
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

            // 3. Get jersey numbers from player_team_season (fallback if not in club_players)
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
                    number: parseInt(jerseyMap[conv.player_id] || conv.club_players.jersey_number || '0'),
                    position: conv.role_in_match || conv.club_players.main_position || '?',
                    starter: false, // Cannot determine from current schema easily, would need starters table
                    stats: aggregatedStats
                }
            })

            // Reconstruct sets
            let sets: Set[] = []

            // V2: Try to get set scores from SET_END events
            const setEndEvents = (matchData.actions || []).filter((a: any) => a.type === 'SET_END')
            if (setEndEvents.length > 0) {
                // Use SET_END events (V2 format) - these have the actual scores
                setEndEvents.forEach((event: any) => {
                    sets.push({
                        id: `set-${event.setNumber || event.payload?.setNumber || sets.length + 1}`,
                        number: event.setNumber || event.payload?.setNumber || sets.length + 1,
                        homeScore: event.payload?.homeScore ?? 0,
                        awayScore: event.payload?.awayScore ?? 0,
                        status: 'completed'
                    })
                })
            } else {
                // Fallback: Infer sets from match_stats if no SET_END events
                const maxSetFromStats = (statsData || []).reduce((max: number, s: any) => Math.max(max, s.set_number), 0)

                if (maxSetFromStats > 0) {
                    for (let i = 1; i <= maxSetFromStats; i++) {
                        // Calculate score from actions if available, otherwise unknown
                        // For now, we don't have per-set score in DB unless we parse actions or add a sets table
                        // We'll leave scores as 0 unless we can parse them from result or actions
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

            // PRIORITY 2: If no sets from stats or actions, try to parse result string (imported matches)
            // Expected format: "3-1 (25-20, 20-25, 25-15, 25-18)" or just "3-0"
            if (sets.length === 0 && matchData.result) {
                const resultStr = matchData.result.trim()

                // Check for detailed scores in parenthesis
                const detailedMatch = resultStr.match(/\((.*?)\)/)
                if (detailedMatch) {
                    const setScoresStr = detailedMatch[1] // "25-20, 20-25, ..."
                    const setScores = setScoresStr.split(',').map((s: string) => s.trim())

                    setScores.forEach((score: string, index: number) => {
                        const [home, away] = score.split('-').map((s: string) => parseInt(s.trim()))
                        if (!isNaN(home) && !isNaN(away)) {
                            sets.push({
                                id: `set-${index + 1}`,
                                number: index + 1,
                                homeScore: home,
                                awayScore: away,
                                status: 'completed'
                            })
                        }
                    })
                } else {
                    // Simple result "3-0"
                    const parts = resultStr.split('-')
                    if (parts.length >= 2) {
                        const homeSets = parseInt(parts[0])
                        const awaySets = parseInt(parts[1])
                        if (!isNaN(homeSets) && !isNaN(awaySets)) {
                            const totalSets = homeSets + awaySets
                            for (let i = 1; i <= totalSets; i++) {
                                sets.push({
                                    id: `set-${i}`,
                                    number: i,
                                    homeScore: 0, // Unknown score
                                    awayScore: 0, // Unknown score
                                    status: 'completed'
                                })
                            }
                        }
                    }
                }
            }

            // Determine winner/loser sets for simple result if detailed scores missing
            if (sets.length > 0 && sets[0].homeScore === 0 && sets[0].awayScore === 0 && matchData.result) {
                const parts = matchData.result.split('-')
                if (parts.length >= 2) {
                    // const homeSetsWon = parseInt(parts[0])
                    // We can't know which sets were won without detailed scores, 
                    // but we can at least show the set count.
                }
            }

            return {
                id: matchData.id,
                dbMatchId: matchData.id,
                opponent: matchData.opponent_name,
                date: matchData.match_date,
                time: new Date(matchData.match_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                location: matchData.location || '',
                status: matchData.status === 'planned' ? 'upcoming' : matchData.status === 'in_progress' ? 'live' : matchData.status === 'finished' ? 'completed' : 'upcoming',
                result: matchData.result || undefined,
                teamId: matchData.team_id,
                season_id: matchData.season_id,
                teamSide: matchData.home_away === 'home' ? 'local' : 'visitante',
                sets: sets,
                players: players,
                currentSet: sets.length || 1,
                setsWonLocal: 0,
                setsWonVisitor: 0,
                sacadorInicialSet1: null, // V2 handles this differently via events
                sacadorInicialSet5: null,
                acciones: matchData.actions || [],
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
