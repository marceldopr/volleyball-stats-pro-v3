import { supabase } from '@/lib/supabaseClient'

export interface TeamSeasonPhaseDB {
    id: string
    team_id: string
    season_id: string
    phase_number: number
    phase_name: string
    primary_objective: string | null
    secondary_objectives: string[] | null
    technical_priorities: string[] | null
    risks_weaknesses: string | null
    kpi: string | null
    evaluation_status: 'Cumplido' | 'Parcial' | 'No Cumplido' | null
    evaluation_reason: string | null
    lessons_learned: string | null
    adjustments_next_phase: string | null
    created_at: string
    updated_at: string
}

export interface TeamSeasonPhaseInput {
    team_id: string
    season_id: string
    phase_number: number
    phase_name: string
    primary_objective?: string
    secondary_objectives?: string[]
    technical_priorities?: string[]
    risks_weaknesses?: string
    kpi?: string
    evaluation_status?: 'Cumplido' | 'Parcial' | 'No Cumplido' | null
    evaluation_reason?: string
    lessons_learned?: string
    adjustments_next_phase?: string
}

export const teamSeasonPhaseService = {
    /**
     * Get all phases for a specific team and season
     */
    getPhasesByTeamAndSeason: async (teamId: string, seasonId: string): Promise<TeamSeasonPhaseDB[]> => {
        try {
            const { data, error } = await supabase
                .from('team_season_phases')
                .select('*')
                .eq('team_id', teamId)
                .eq('season_id', seasonId)
                .order('phase_number', { ascending: true })

            if (error) {
                console.error('Error fetching team season phases:', error)
                throw error
            }

            return data || []
        } catch (error) {
            console.error('Error in getPhasesByTeamAndSeason:', error)
            throw error
        }
    },

    /**
     * Get a specific phase by ID
     */
    getPhase: async (id: string): Promise<TeamSeasonPhaseDB | null> => {
        try {
            const { data, error } = await supabase
                .from('team_season_phases')
                .select('*')
                .eq('id', id)
                .single()

            if (error) {
                if (error.code === 'PGRST116') {
                    return null
                }
                console.error('Error fetching phase:', error)
                throw error
            }

            return data
        } catch (error) {
            console.error('Error in getPhase:', error)
            throw error
        }
    },

    /**
     * Create or update a phase (upsert)
     */
    upsertPhase: async (data: TeamSeasonPhaseInput): Promise<TeamSeasonPhaseDB> => {
        try {
            const { data: result, error } = await supabase
                .from('team_season_phases')
                .upsert({
                    team_id: data.team_id,
                    season_id: data.season_id,
                    phase_number: data.phase_number,
                    phase_name: data.phase_name,
                    primary_objective: data.primary_objective || null,
                    secondary_objectives: data.secondary_objectives || null,
                    technical_priorities: data.technical_priorities || null,
                    risks_weaknesses: data.risks_weaknesses || null,
                    kpi: data.kpi || null,
                    evaluation_status: data.evaluation_status || null,
                    evaluation_reason: data.evaluation_reason || null,
                    lessons_learned: data.lessons_learned || null,
                    adjustments_next_phase: data.adjustments_next_phase || null,
                }, {
                    onConflict: 'team_id,season_id,phase_number'
                })
                .select()
                .single()

            if (error) {
                console.error('Error upserting phase:', error)
                throw error
            }

            return result
        } catch (error) {
            console.error('Error in upsertPhase:', error)
            throw error
        }
    },

    /**
     * Delete a phase
     */
    deletePhase: async (id: string): Promise<void> => {
        try {
            const { error } = await supabase
                .from('team_season_phases')
                .delete()
                .eq('id', id)

            if (error) {
                console.error('Error deleting phase:', error)
                throw error
            }
        } catch (error) {
            console.error('Error in deletePhase:', error)
            throw error
        }
    },

    /**
     * Initialize default phases for a team-season if they don't exist
     */
    initializeDefaultPhases: async (teamId: string, seasonId: string): Promise<TeamSeasonPhaseDB[]> => {
        try {
            // Check if phases already exist
            const existing = await teamSeasonPhaseService.getPhasesByTeamAndSeason(teamId, seasonId)

            if (existing.length > 0) {
                return existing
            }

            // Create default 3 phases
            const defaultPhases = [
                {
                    team_id: teamId,
                    season_id: seasonId,
                    phase_number: 1,
                    phase_name: 'Construcción / Estabilidad'
                },
                {
                    team_id: teamId,
                    season_id: seasonId,
                    phase_number: 2,
                    phase_name: 'Expansión / Juego proactivo'
                },
                {
                    team_id: teamId,
                    season_id: seasonId,
                    phase_number: 3,
                    phase_name: 'Rendimiento / Competición'
                }
            ]

            const created: TeamSeasonPhaseDB[] = []
            for (const phase of defaultPhases) {
                const result = await teamSeasonPhaseService.upsertPhase(phase)
                created.push(result)
            }

            return created
        } catch (error) {
            console.error('Error in initializeDefaultPhases:', error)
            throw error
        }
    }
}
