import { supabase } from '@/lib/supabaseClient'

export interface MatchConvocationDB {
    id: string
    match_id: string
    player_id: string
    team_id: string
    season_id: string
    status: string // 'convocado' | 'no_convocado' | 'lesionado' | 'descanso' | 'otro'
    role_in_match: string | null
    reason_not_convoked: string | null
    notes: string | null
    created_at: string
    updated_at: string
}

export const matchConvocationService = {
    /**
     * Get all convocations for a specific match
     */
    getConvocationsByMatch: async (matchId: string): Promise<MatchConvocationDB[]> => {
        try {
            const { data, error } = await supabase
                .from('match_convocations')
                .select('*')
                .eq('match_id', matchId)
                .order('created_at', { ascending: true })

            if (error) {
                console.error('Error fetching convocations:', error)
                throw error
            }

            return data || []
        } catch (error) {
            console.error('Error in getConvocationsByMatch:', error)
            throw error
        }
    },

    /**
     * Set convocations for a match (replaces all existing convocations)
     * This is useful when setting up the initial call-up list
     */
    setConvocationsForMatch: async (params: {
        matchId: string
        teamId: string
        seasonId: string
        convocations: Array<{
            player_id: string
            status: string
            role_in_match?: string
            reason_not_convoked?: string
            notes?: string
        }>
    }): Promise<MatchConvocationDB[]> => {
        try {
            const { matchId, teamId, seasonId, convocations } = params

            // Step 1: Delete existing convocations for this match
            const { error: deleteError } = await supabase
                .from('match_convocations')
                .delete()
                .eq('match_id', matchId)

            if (deleteError) {
                console.error('Error deleting existing convocations:', deleteError)
                throw deleteError
            }

            // Step 2: Insert new convocations
            const convocationsData = convocations.map(conv => ({
                match_id: matchId,
                team_id: teamId,
                season_id: seasonId,
                player_id: conv.player_id,
                status: conv.status,
                role_in_match: conv.role_in_match || null,
                reason_not_convoked: conv.reason_not_convoked || null,
                notes: conv.notes || null
            }))

            const { data, error: insertError } = await supabase
                .from('match_convocations')
                .insert(convocationsData)
                .select()

            if (insertError) {
                console.error('Error inserting convocations:', insertError)
                throw insertError
            }

            return data || []
        } catch (error) {
            console.error('Error in setConvocationsForMatch:', error)
            throw error
        }
    },

    /**
     * Update a single convocation
     */
    updateConvocation: async (
        id: string,
        data: Partial<MatchConvocationDB>
    ): Promise<MatchConvocationDB> => {
        try {
            // Remove read-only fields
            const { id: _, created_at, updated_at, match_id, player_id, team_id, season_id, ...updateData } = data as any

            const { data: updatedConvocation, error } = await supabase
                .from('match_convocations')
                .update(updateData)
                .eq('id', id)
                .select()
                .single()

            if (error) {
                console.error('Error updating convocation:', error)
                throw error
            }

            return updatedConvocation
        } catch (error) {
            console.error('Error in updateConvocation:', error)
            throw error
        }
    },

    /**
     * Delete a convocation
     */
    deleteConvocation: async (id: string): Promise<void> => {
        try {
            const { error } = await supabase
                .from('match_convocations')
                .delete()
                .eq('id', id)

            if (error) {
                console.error('Error deleting convocation:', error)
                throw error
            }
        } catch (error) {
            console.error('Error in deleteConvocation:', error)
            throw error
        }
    },

    /**
     * Get convocations by player (useful for player history)
     */
    getConvocationsByPlayer: async (playerId: string, seasonId?: string): Promise<MatchConvocationDB[]> => {
        try {
            let query = supabase
                .from('match_convocations')
                .select('*')
                .eq('player_id', playerId)

            if (seasonId) {
                query = query.eq('season_id', seasonId)
            }

            const { data, error } = await query.order('created_at', { ascending: false })

            if (error) {
                console.error('Error fetching player convocations:', error)
                throw error
            }

            return data || []
        } catch (error) {
            console.error('Error in getConvocationsByPlayer:', error)
            throw error
        }
    }
}
