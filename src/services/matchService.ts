import { supabase } from '@/lib/supabaseClient'

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
