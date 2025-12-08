import { supabase } from '@/lib/supabaseClient'

/**
 * matchServiceV2 - Servei per a partits V2 amb event-sourcing
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

export const matchServiceV2 = {
    /**
     * Crear un nou partit V2
     */
    async createMatchV2(input: CreateMatchV2Input): Promise<string> {
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
     * Obtenir un partit V2 per ID
     */
    async getMatchV2(id: string): Promise<MatchV2DB | null> {
        try {
            const { data, error } = await supabase
                .from('matches')
                .select('*, teams(custom_name)')
                .eq('id', id)
                .eq('engine', 'v2')  // NOMÉS V2
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
     * Llistar partits V2 per club i temporada
     */
    async listMatchesV2(clubId: string, seasonId: string): Promise<MatchV2DB[]> {
        try {
            const { data, error } = await supabase
                .from('matches')
                .select('*')
                .eq('club_id', clubId)
                .eq('season_id', seasonId)
                .eq('engine', 'v2')  // NOMÉS V2
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
     * Actualitzar un partit V2
     */
    async updateMatchV2(
        id: string,
        updates: {
            actions?: any[]
            status?: string
            result?: string
        }
    ): Promise<void> {
        try {
            // Verificar que és un partit V2
            const match = await this.getMatchV2(id)
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
                .eq('engine', 'v2')  // NOMÉS V2

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
     * Eliminar un partit V2
     */
    async deleteMatchV2(id: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('matches')
                .delete()
                .eq('id', id)
                .eq('engine', 'v2')  // NOMÉS V2

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
    async getConvocationsV2(matchId: string): Promise<any[]> {
        try {
            const { data, error } = await supabase
                .from('match_convocations')
                .select('*, club_players!inner(*)')
                .eq('match_id', matchId)

            if (error) throw error
            return data || []
        } catch (error) {
            console.error('Error getting convocations V2:', error)
            throw error
        }
    },

    /**
     * Guardar convocatòria V2 (reemplaça l'existent)
     */
    async saveConvocationV2(matchId: string, teamId: string, seasonId: string, playerIds: string[]): Promise<void> {
        try {
            // 1. Eliminar convocatòries existents
            const { error: deleteError } = await supabase
                .from('match_convocations')
                .delete()
                .eq('match_id', matchId)

            if (deleteError) throw deleteError

            // 2. Inserir noves convocatòries
            if (playerIds.length === 0) return

            const convocationsData = playerIds.map(playerId => ({
                match_id: matchId,
                team_id: teamId,
                season_id: seasonId,
                player_id: playerId,
                status: 'convocado',
                role_in_match: null
            }))

            const { error: insertError } = await supabase
                .from('match_convocations')
                .insert(convocationsData)

            if (insertError) throw insertError
        } catch (error) {
            console.error('Error saving convocation V2:', error)
            throw error
        }
    },

    /**
     * Iniciar partit V2
     */
    async startMatchV2(matchId: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('matches')
                .update({
                    status: 'in_progress',
                    updated_at: new Date().toISOString()
                })
                .eq('id', matchId)
                .eq('engine', 'v2')

            if (error) throw error
        } catch (error) {
            console.error('Error starting match V2:', error)
            throw error
        }
    }
}
