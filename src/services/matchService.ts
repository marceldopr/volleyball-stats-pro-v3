import { supabase } from '@/lib/supabaseClient'

/**
 * matchService - Servei per a partits con event-sourcing
 * 
 * IMPORTANT: Aquest servei és COMPLETAMENT NOU i AÏLLAT del V1
 * - Només gestiona partits amb engine: 'v2'
 * - NO toca cap partit V1
 * - Utilitza event-sourcing i time-travel
 */

export interface MatchV2DB {
    id: string
    club_id: string
    season_id: string
    team_id: string
    opponent_name: string
    competition_name: string | null
    match_date: string
    match_time: string | null
    home_away: 'home' | 'away'
    status: 'planned' | 'in_progress' | 'finished' | 'cancelled'
    result: string | null
    notes: string | null
    actions: any[] | null
    engine: 'v2'  // SEMPRE 'v2'
    created_at: string
    updated_at: string
    teams?: {
        custom_name: string
        category_stage?: string
        gender?: string
    }
}

export interface CreateMatchV2Input {
    club_id: string
    season_id: string
    team_id: string
    opponent_name: string
    competition_name?: string
    match_date: string
    match_time?: string
    home_away: 'home' | 'away'
    notes?: string
}

export const matchService = {
    /**
     * Crear un nou partit
     */
    async createMatch(input: CreateMatchV2Input): Promise<string> {
        try {
            const { data, error } = await supabase
                .from('matches')
                .insert({
                    club_id: input.club_id,
                    season_id: input.season_id,
                    team_id: input.team_id,
                    opponent_name: input.opponent_name,
                    competition_name: input.competition_name || null,
                    match_date: input.match_date,
                    match_time: input.match_time || null,
                    home_away: input.home_away,
                    status: 'planned',
                    result: null,
                    notes: input.notes || null,
                    actions: [],
                    engine: 'v2'  // SEMPRE 'v2'
                })
                .select('id')
                .single()

            if (error) {
                console.error('Error creating V2 match:', error)
                throw error
            }

            return data.id
        } catch (error) {
            console.error('Error in createMatchV2:', error)
            throw error
        }
    },

    /**
     * Obtenir un partit per ID
     */
    async getMatch(id: string): Promise<MatchV2DB | null> {
        try {
            const { data, error } = await supabase
                .from('matches')
                .select('*, teams(custom_name, category_stage, gender)')
                .eq('id', id)

                .single()

            if (error) {
                if (error.code === 'PGRST116') {
                    return null
                }
                console.error('Error fetching V2 match:', error)
                throw error
            }

            return data as MatchV2DB
        } catch (error) {
            console.error('Error in getMatchV2:', error)
            throw error
        }
    },

    /**
     * Llistar partits per club i temporada
     */
    async listMatches(clubId: string, seasonId: string): Promise<MatchV2DB[]> {
        try {
            const { data, error } = await supabase
                .from('matches')
                .select('*')
                .eq('club_id', clubId)
                .eq('season_id', seasonId)

                .order('match_date', { ascending: false })

            if (error) {
                console.error('Error fetching V2 matches:', error)
                throw error
            }

            return (data as MatchV2DB[]) || []
        } catch (error) {
            console.error('Error in listMatchesV2:', error)
            throw error
        }
    },

    /**
     * Actualitzar un partit
     */
    async updateMatch(
        id: string,
        updates: {
            actions?: any[]
            status?: string
            result?: string
        }
    ): Promise<void> {
        try {
            // Verificar que és un partit V2
            const match = await this.getMatch(id)
            if (!match) {
                throw new Error('Match V2 not found')
            }

            const { error } = await supabase
                .from('matches')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)


            if (error) {
                console.error('Error updating V2 match:', error)
                throw error
            }
        } catch (error) {
            console.error('Error in updateMatchV2:', error)
            throw error
        }
    },

    /**
     * Eliminar un partit
     */
    async deleteMatch(id: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('matches')
                .delete()
                .eq('id', id)


            if (error) {
                console.error('Error deleting V2 match:', error)
                throw error
            }
        } catch (error) {
            console.error('Error in deleteMatchV2:', error)
            throw error
        }
    },

    /**
     * Obtenir convocatòries d'un partit
     */
    async getConvocations(matchId: string): Promise<any[]> {
        try {
            const { data, error } = await supabase
                .from('match_convocations')
                .select('*, jersey_number_override, position_override, club_players!inner(*)')
                .eq('match_id', matchId)

            if (error) throw error
            return data || []
        } catch (error) {
            console.error('Error getting convocations V2:', error)
            throw error
        }
    },

    /**
     * Guardar convocatòria (Atomic Diff via RPC)
     * Preserva overrides de jugadoras que se mantienen convocadas.
     */
    async saveConvocation(matchId: string, teamId: string, seasonId: string, playerIds: string[]): Promise<void> {
        try {
            const { error } = await supabase.rpc('save_match_convocation_diff', {
                p_match_id: matchId,
                p_team_id: teamId,
                p_season_id: seasonId,
                p_player_ids: playerIds
            })

            if (error) throw error
        } catch (error) {
            console.error('Error saving convocation V2 (RPC):', error)
            throw error
        }
    },

    /**
     * Update specific overrides for a convocation (Direct Update)
     */
    async updateConvocationOverride(matchId: string, playerId: string, updates: { jersey_number_override?: string | null, position_override?: string | null }): Promise<void> {
        try {
            const { error } = await supabase
                .from('match_convocations')
                .update(updates)
                .eq('match_id', matchId)
                .eq('player_id', playerId)

            if (error) throw error
        } catch (error) {
            console.error('Error updating convocation override:', error)
            throw error
        }
    },

    /**
     * Get full match details including players and stats (from V1)
     * Used for match analysis pages
     */
    async getMatchFullDetails(id: string): Promise<any | null> {
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

            const jerseyMap = (rosterData || []).reduce((acc: any, item: any) => {
                acc[item.player_id] = item.jersey_number
                return acc
            }, {})

            // 4. Get stats
            const { data: statsData, error: statsError } = await supabase
                .from('match_player_set_stats')
                .select('*')
                .eq('match_id', id)

            if (statsError) {
                console.error('Error fetching stats:', statsError)
            }

            // 5. Transform to Match object
            const players = (convocationData || []).map((conv: any) => {
                const playerStats = (statsData || []).filter((s: any) => s.player_id === conv.player_id)

                // Aggregate stats
                const aggregatedStats = {
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
                    starter: false,
                    stats: aggregatedStats
                }
            })

            return {
                id: matchData.id,
                opponent: matchData.opponent_name,
                date: matchData.match_date,
                status: matchData.status,
                result: matchData.result,
                teamId: matchData.team_id,
                season_id: matchData.season_id,
                teamSide: matchData.home_away === 'home' ? 'local' : 'visitante',
                players: players,
                acciones: matchData.actions || [],
            }
        } catch (error) {
            console.error('Error in getMatchFullDetails:', error)
            return null
        }
    },

    /**
     * Iniciar partit
     */
    async startMatch(matchId: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('matches')
                .update({
                    status: 'in_progress',
                    updated_at: new Date().toISOString()
                })
                .eq('id', matchId)


            if (error) throw error
        } catch (error) {
            console.error('Error starting match V2:', error)
            throw error
        }
    }
}
