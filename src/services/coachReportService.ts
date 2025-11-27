import { supabase } from '@/lib/supabaseClient'
import { CoachReportDB } from '@/types/CoachReport'

export const coachReportService = {
    /**
     * Create a new coach report
     */
    createReport: async (
        report: Omit<CoachReportDB, 'id' | 'created_at' | 'updated_at'>
    ): Promise<CoachReportDB> => {
        try {
            const { data, error } = await supabase
                .from('coach_reports')
                .insert([report])
                .select()
                .single()

            if (error) {
                console.error('Error creating coach report:', error)
                throw error
            }

            return data
        } catch (error) {
            console.error('Error in createReport:', error)
            throw error
        }
    },

    /**
     * Get all reports for a specific coach
     */
    getReportsByCoach: async (coachId: string): Promise<CoachReportDB[]> => {
        try {
            const { data, error } = await supabase
                .from('coach_reports')
                .select('*')
                .eq('coach_id', coachId)
                .order('fecha', { ascending: false })

            if (error) {
                console.error('Error fetching coach reports:', error)
                throw error
            }

            return data || []
        } catch (error) {
            console.error('Error in getReportsByCoach:', error)
            throw error
        }
    },

    /**
     * Get all reports for a club in a season
     */
    getReportsByClubSeason: async (clubId: string, seasonId: string): Promise<CoachReportDB[]> => {
        try {
            const { data, error } = await supabase
                .from('coach_reports')
                .select('*')
                .eq('club_id', clubId)
                .eq('season_id', seasonId)
                .order('fecha', { ascending: false })

            if (error) {
                console.error('Error fetching club season coach reports:', error)
                throw error
            }

            return data || []
        } catch (error) {
            console.error('Error in getReportsByClubSeason:', error)
            throw error
        }
    },

    /**
     * Get reports filtered by coach and season
     */
    getReportsByCoachSeason: async (
        coachId: string,
        seasonId: string
    ): Promise<CoachReportDB[]> => {
        try {
            const { data, error } = await supabase
                .from('coach_reports')
                .select('*')
                .eq('coach_id', coachId)
                .eq('season_id', seasonId)
                .order('fecha', { ascending: false })

            if (error) {
                console.error('Error fetching coach season reports:', error)
                throw error
            }

            return data || []
        } catch (error) {
            console.error('Error in getReportsByCoachSeason:', error)
            throw error
        }
    },

    /**
     * Update a coach report
     */
    updateReport: async (
        id: string,
        updates: Partial<Omit<CoachReportDB, 'id' | 'created_at' | 'updated_at'>>
    ): Promise<CoachReportDB> => {
        try {
            const { data, error } = await supabase
                .from('coach_reports')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single()

            if (error) {
                console.error('Error updating coach report:', error)
                throw error
            }

            return data
        } catch (error) {
            console.error('Error in updateReport:', error)
            throw error
        }
    },

    /**
     * Delete a coach report
     */
    deleteReport: async (id: string): Promise<void> => {
        try {
            const { error } = await supabase
                .from('coach_reports')
                .delete()
                .eq('id', id)

            if (error) {
                console.error('Error deleting coach report:', error)
                throw error
            }
        } catch (error) {
            console.error('Error in deleteReport:', error)
            throw error
        }
    }
}
