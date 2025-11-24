import { supabase } from '@/lib/supabaseClient'

export interface PlayerReportDB {
    id: string
    club_id: string
    player_id: string
    author_user_id: string
    date: string // ISO format
    title: string
    content: string
    created_at: string
    updated_at: string
}

export const reportService = {
    /**
     * Get all reports for a specific player in a club
     */
    getReportsByPlayer: async (clubId: string, playerId: string): Promise<PlayerReportDB[]> => {
        try {
            const { data, error } = await supabase
                .from('reports')
                .select('*')
                .eq('club_id', clubId)
                .eq('player_id', playerId)
                .order('date', { ascending: false })

            if (error) {
                console.error('Error fetching player reports:', error)
                throw error
            }

            return data || []
        } catch (error) {
            console.error('Error in getReportsByPlayer:', error)
            throw error
        }
    },

    /**
     * Create a new player report
     */
    createPlayerReport: async (data: {
        club_id: string
        player_id: string
        author_user_id: string
        date: string
        title: string
        content: string
    }): Promise<PlayerReportDB> => {
        try {
            const { data: newReport, error } = await supabase
                .from('reports')
                .insert([data])
                .select()
                .single()

            if (error) {
                console.error('Error creating player report:', error)
                throw error
            }

            return newReport
        } catch (error) {
            console.error('Error in createPlayerReport:', error)
            throw error
        }
    },

    /**
     * Update an existing player report (optional)
     */
    updatePlayerReport: async (
        id: string,
        data: {
            title?: string
            content?: string
            date?: string
        }
    ): Promise<PlayerReportDB> => {
        try {
            const { data: updatedReport, error } = await supabase
                .from('reports')
                .update({ ...data, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single()

            if (error) {
                console.error('Error updating player report:', error)
                throw error
            }

            return updatedReport
        } catch (error) {
            console.error('Error in updatePlayerReport:', error)
            throw error
        }
    },

    /**
     * Delete a player report (optional)
     */
    deletePlayerReport: async (id: string): Promise<void> => {
        try {
            const { error } = await supabase
                .from('reports')
                .delete()
                .eq('id', id)

            if (error) {
                console.error('Error deleting player report:', error)
                throw error
            }
        } catch (error) {
            console.error('Error in deletePlayerReport:', error)
            throw error
        }
    }
}
