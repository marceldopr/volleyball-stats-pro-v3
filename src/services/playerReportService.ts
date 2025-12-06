import { supabase } from '@/lib/supabaseClient'
import { PlayerReportDB } from '@/types/ReportTypes'

export interface PlayerReportWithDetails extends PlayerReportDB {
    player_name: string
    team_name: string
    author_name: string
}

export const playerReportService = {
    /**
     * Create a new structured player report
     */
    createReport: async (data: Omit<PlayerReportDB, 'id' | 'created_at' | 'updated_at'>): Promise<PlayerReportDB> => {
        try {
            const { data: newReport, error } = await supabase
                .from('player_reports')
                .insert([data])
                .select()
                .single()

            if (error) {
                console.error('Error creating player report:', error)
                throw error
            }

            return newReport
        } catch (error) {
            console.error('Error in createReport:', error)
            throw error
        }
    },

    /**
     * Get all reports for a specific player
     */
    getReportsByPlayer: async (playerId: string): Promise<PlayerReportDB[]> => {
        try {
            const { data, error } = await supabase
                .from('player_reports')
                .select('*')
                .eq('player_id', playerId)
                .order('report_date', { ascending: false })

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
     * Get reports by team and season (for DT view)
     */
    getReportsByTeamSeason: async (teamId: string, seasonId: string): Promise<PlayerReportDB[]> => {
        try {
            const { data, error } = await supabase
                .from('player_reports')
                .select('*')
                .eq('team_id', teamId)
                .eq('season_id', seasonId)
                .order('report_date', { ascending: false })

            if (error) {
                console.error('Error fetching team reports:', error)
                throw error
            }

            return data || []
        } catch (error) {
            console.error('Error in getReportsByTeamSeason:', error)
            throw error
        }
    },

    /**
     * Update an existing report
     */
    updateReport: async (
        id: string,
        updates: Partial<Pick<PlayerReportDB, 'sections' | 'final_comment' | 'report_date' | 'match_id'>>
    ): Promise<PlayerReportDB> => {
        try {
            const { data: updatedReport, error } = await supabase
                .from('player_reports')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single()

            if (error) {
                console.error('Error updating player report:', error)
                throw error
            }

            return updatedReport
        } catch (error) {
            console.error('Error in updateReport:', error)
            throw error
        }
    },

    /**
     * Delete a report
     */
    deleteReport: async (id: string): Promise<void> => {
        try {
            const { error } = await supabase
                .from('player_reports')
                .delete()
                .eq('id', id)

            if (error) {
                console.error('Error deleting player report:', error)
                throw error
            }
        } catch (error) {
            console.error('Error in deleteReport:', error)
            throw error
        }
    },

    /**
     * Get reports with player, team, and author details (for reports table view)
     * Optionally filter by team IDs (for coach view)
     */
    getReportsWithDetails: async (
        clubId: string,
        seasonId: string,
        teamIds?: string[]
    ): Promise<PlayerReportWithDetails[]> => {
        try {
            let query = supabase
                .from('player_reports')
                .select(`
                    *,
                    player:club_players!player_id(first_name, last_name),
                    team:teams!team_id(custom_name),
                    author:profiles!created_by(full_name)
                `)
                .eq('club_id', clubId)
                .eq('season_id', seasonId)

            // Filter by team IDs if provided (for coaches)
            if (teamIds && teamIds.length > 0) {
                query = query.in('team_id', teamIds)
            }

            const { data, error } = await query.order('report_date', { ascending: false })

            if (error) {
                console.error('Error fetching reports with details:', error)
                throw error
            }

            // Transform the data to flatten the joined fields
            const reportsWithDetails: PlayerReportWithDetails[] = (data || []).map((report: any) => ({
                ...report,
                player_name: report.player
                    ? `${report.player.first_name} ${report.player.last_name}`
                    : 'Desconocido',
                team_name: report.team?.custom_name || 'Desconocido',
                author_name: report.author?.full_name || 'Desconocido'
            }))

            return reportsWithDetails
        } catch (error) {
            console.error('Error in getReportsWithDetails:', error)
            throw error
        }
    }
}
