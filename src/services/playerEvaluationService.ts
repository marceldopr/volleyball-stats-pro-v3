import { supabase } from '@/lib/supabaseClient'

export interface PlayerEvaluationDB {
    id: string
    player_id: string
    team_id: string
    season_id: string
    phase: 'start' | 'mid' | 'end'

    // Performance ratings (1-3)
    service_rating?: number
    reception_rating?: number
    attack_rating?: number
    block_rating?: number
    defense_rating?: number
    error_impact_rating?: number

    // Role
    role_in_team?: 'starter' | 'rotation' | 'specialist' | 'development'

    // Text fields
    competitive_mindset?: string
    coach_recommendation?: string

    // Metadata
    created_by?: string
    created_at: string
    updated_at: string
}

export interface PlayerEvaluationInput {
    player_id: string
    team_id: string
    season_id: string
    phase: 'start' | 'mid' | 'end'
    service_rating?: number
    reception_rating?: number
    attack_rating?: number
    block_rating?: number
    defense_rating?: number
    error_impact_rating?: number
    role_in_team?: 'starter' | 'rotation' | 'specialist' | 'development'
    competitive_mindset?: string
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
        phase: 'start' | 'mid' | 'end'
    ): Promise<PlayerEvaluationDB | null> => {
        const { data, error } = await supabase
            .from('player_team_season_evaluations')
            .select('*')
            .eq('player_id', playerId)
            .eq('team_id', teamId)
            .eq('season_id', seasonId)
            .eq('phase', phase)
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
                teams:team_id(custom_name),
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
     * Get all evaluations for a specific player in a team/season
     * Returns evaluations ordered by phase (start, mid, end)
     */
    getPlayerEvaluationsByTeamSeason: async (
        playerId: string,
        teamId: string,
        seasonId: string
    ): Promise<PlayerEvaluationDB[]> => {
        const { data, error } = await supabase
            .from('player_team_season_evaluations')
            .select('*')
            .eq('player_id', playerId)
            .eq('team_id', teamId)
            .eq('season_id', seasonId)

        if (error) {
            console.error('[playerEvaluationService] Error fetching player evaluations by team/season:', error)
            return []
        }

        // Sort by phase order: start, mid, end
        const phaseOrder: Record<string, number> = { start: 1, mid: 2, end: 3 }
        const sorted = (data || []).sort((a, b) => phaseOrder[a.phase] - phaseOrder[b.phase])

        return sorted
    },

    /**
     * Get all evaluations across all teams (for DT Reports view)
     */
    getAllEvaluations: async (clubId: string): Promise<PlayerEvaluationDB[]> => {
        // First, get all teams for this club
        const { data: teams, error: teamsError } = await supabase
            .from('teams')
            .select('id')
            .eq('club_id', clubId)

        if (teamsError) {
            console.error('[playerEvaluationService] Error fetching teams:', teamsError)
            throw teamsError
        }

        if (!teams || teams.length === 0) {
            console.log('[playerEvaluationService] No teams found for club:', clubId)
            return []
        }

        const teamIds = teams.map(t => t.id)
        console.log('[playerEvaluationService] Found teams:', teamIds.length)

        // Get evaluations for these teams
        const { data, error } = await supabase
            .from('player_team_season_evaluations')
            .select('*')
            .in('team_id', teamIds)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[playerEvaluationService] Error fetching evaluations:', error)
            throw error
        }

        if (!data || data.length === 0) {
            console.log('[playerEvaluationService] No evaluations found')
            return []
        }

        console.log('[playerEvaluationService] Found evaluations:', data.length)

        // Get unique player, team, and season IDs
        const playerIds = [...new Set(data.map(e => e.player_id))]
        const seasonIds = [...new Set(data.map(e => e.season_id))]

        console.log('[playerEvaluationService] Fetching data for:', { players: playerIds.length, teams: teamIds.length, seasons: seasonIds.length })

        // Fetch players
        const { data: players, error: playersError } = await supabase
            .from('club_players')
            .select('id, first_name, last_name')
            .in('id', playerIds)

        if (playersError) {
            console.error('[playerEvaluationService] Error fetching players:', playersError)
        }

        // Fetch teams
        const { data: teamsData, error: teamsDataError } = await supabase
            .from('teams')
            .select('*')
            .in('id', teamIds)

        if (teamsDataError) {
            console.error('[playerEvaluationService] Error fetching teams data:', teamsDataError)
        }

        // Fetch seasons
        const { data: seasons, error: seasonsError } = await supabase
            .from('seasons')
            .select('id, name')
            .in('id', seasonIds)

        if (seasonsError) {
            console.error('[playerEvaluationService] Error fetching seasons:', seasonsError)
        }

        console.log('[playerEvaluationService] Fetched related data:', {
            players: players?.length || 0,
            teams: teamsData?.length || 0,
            seasons: seasons?.length || 0
        })

        console.log('[playerEvaluationService] Sample data:', {
            player: players?.[0],
            team: teamsData?.[0],
            season: seasons?.[0]
        })

        // Create lookup maps
        const playerMap = new Map(players?.map(p => [p.id, p]) || [])
        const teamMap = new Map(teamsData?.map(t => [t.id, t]) || [])
        const seasonMap = new Map(seasons?.map(s => [s.id, s]) || [])

        // Enrich evaluations with related data
        const enriched = data.map((evaluation: any) => {
            const player = playerMap.get(evaluation.player_id)
            const team = teamMap.get(evaluation.team_id)
            const season = seasonMap.get(evaluation.season_id)

            return {
                ...evaluation,
                player,
                team,
                season
            }
        })

        console.log('[playerEvaluationService] Sample enriched evaluation:', enriched[0])

        return enriched
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
                onConflict: 'player_id,team_id,season_id,phase'
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

        // Get evaluation counts by phase
        const { data: evaluations } = await supabase
            .from('player_team_season_evaluations')
            .select('phase')
            .eq('team_id', teamId)
            .eq('season_id', seasonId)

        const startCompleted = evaluations?.filter((e: { phase: string }) => e.phase === 'start').length || 0
        const midCompleted = evaluations?.filter((e: { phase: string }) => e.phase === 'mid').length || 0
        const endCompleted = evaluations?.filter((e: { phase: string }) => e.phase === 'end').length || 0

        return {
            total_players: totalPlayers || 0,
            start_completed: startCompleted,
            mid_completed: midCompleted,
            end_completed: endCompleted
        }
    }
}
