import { supabase } from '@/lib/supabaseClient'

export interface PhaseEvaluationDB {
    id: string
    team_id: string
    season_id: string
    phase_id: string
    status: 'Cumplido' | 'Parcial' | 'No Cumplido'
    reasons: string
    match_impact: string | null
    next_adjustments: string
    dominant_weakness: string | null
    trend: 'improving' | 'declining' | 'stable' | null
    created_at: string
    updated_at: string
}

export interface PhaseEvaluationInput {
    team_id: string
    season_id: string
    phase_id: string
    status: 'Cumplido' | 'Parcial' | 'No Cumplido'
    reasons: string
    match_impact?: string
    next_adjustments: string
    dominant_weakness?: string
    trend?: 'improving' | 'declining' | 'stable'
}

export const phaseEvaluationService = {
    /**
     * Get evaluation for a specific phase
     */
    getEvaluationByPhase: async (phaseId: string): Promise<PhaseEvaluationDB | null> => {
        try {
            const { data, error } = await supabase
                .from('training_phase_evaluation')
                .select('*')
                .eq('phase_id', phaseId)
                .single()

            if (error) {
                if (error.code === 'PGRST116') {
                    return null
                }
                console.error('Error fetching phase evaluation:', error)
                throw error
            }

            return data
        } catch (error) {
            console.error('Error in getEvaluationByPhase:', error)
            throw error
        }
    },

    /**
     * Create or update a phase evaluation (upsert)
     */
    upsertEvaluation: async (data: PhaseEvaluationInput): Promise<PhaseEvaluationDB> => {
        try {
            const { data: result, error } = await supabase
                .from('training_phase_evaluation')
                .upsert({
                    team_id: data.team_id,
                    season_id: data.season_id,
                    phase_id: data.phase_id,
                    status: data.status,
                    reasons: data.reasons,
                    match_impact: data.match_impact || null,
                    next_adjustments: data.next_adjustments,
                    dominant_weakness: data.dominant_weakness || null,
                    trend: data.trend || null,
                }, {
                    onConflict: 'phase_id'
                })
                .select()
                .single()

            if (error) {
                console.error('Error upserting phase evaluation:', error)
                throw error
            }

            return result
        } catch (error) {
            console.error('Error in upsertEvaluation:', error)
            throw error
        }
    },

    /**
     * Delete a phase evaluation
     */
    deleteEvaluation: async (id: string): Promise<void> => {
        try {
            const { error } = await supabase
                .from('training_phase_evaluation')
                .delete()
                .eq('id', id)

            if (error) {
                console.error('Error deleting phase evaluation:', error)
                throw error
            }
        } catch (error) {
            console.error('Error in deleteEvaluation:', error)
            throw error
        }
    },

    /**
     * Get all evaluations for a team and season
     */
    getEvaluationsByTeamAndSeason: async (teamId: string, seasonId: string): Promise<PhaseEvaluationDB[]> => {
        try {
            const { data, error } = await supabase
                .from('training_phase_evaluation')
                .select('*')
                .eq('team_id', teamId)
                .eq('season_id', seasonId)

            if (error) {
                console.error('Error fetching evaluations:', error)
                throw error
            }

            return data || []
        } catch (error) {
            console.error('Error in getEvaluationsByTeamAndSeason:', error)
            throw error
        }
    },

    /**
     * Get all evaluations for all teams in a club and season (for Club Dashboard)
     */
    getAllEvaluationsByClubAndSeason: async (clubId: string, seasonId: string): Promise<PhaseEvaluationDB[]> => {
        try {
            const { data, error } = await supabase
                .from('training_phase_evaluation')
                .select(`
                    *,
                    teams!inner(club_id)
                `)
                .eq('teams.club_id', clubId)
                .eq('season_id', seasonId)

            if (error) {
                console.error('Error fetching club evaluations:', error)
                throw error
            }

            return data || []
        } catch (error) {
            console.error('Error in getAllEvaluationsByClubAndSeason:', error)
            throw error
        }
    }
}
