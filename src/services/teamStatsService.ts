import { supabase } from '@/lib/supabaseClient'

export interface CurrentPhaseInfo {
    phaseNumber: number
    phaseName: string
    primaryGoal: string
    technicalPriority: string
    kpiTarget: string
    kpiCurrent?: number
}

export interface RecentActivity {
    lastTraining: {
        date: string
        attendance: number
        totalPlayers: number
    } | null
    lastMatch: {
        date: string
        opponent: string
        result: 'win' | 'loss' | 'draw'
        score: string
    } | null
    nextMatch: {
        date: string
        opponent: string
    } | null
}

export interface TeamStats {
    attendanceAverage: number
    pointsErrorRatio: number
    receptionEffectiveness: number
}

export const teamStatsService = {
    /**
     * Get current phase information for a team
     */
    getCurrentPhase: async (teamId: string, seasonId: string): Promise<CurrentPhaseInfo | null> => {
        try {
            // Get the current active phase
            const { data: phases, error } = await supabase
                .from('team_season_phases')
                .select('*')
                .eq('team_id', teamId)
                .eq('season_id', seasonId)
                .order('phase_number', { ascending: false })
                .limit(1)

            if (error) {
                console.error('[teamStatsService] Error fetching current phase:', error)
                return null
            }

            if (!phases || phases.length === 0) {
                return null
            }

            const phase = phases[0]

            return {
                phaseNumber: phase.phase_number,
                phaseName: phase.phase_name || `Fase ${phase.phase_number}`,
                primaryGoal: phase.primary_goal || 'Sin objetivo definido',
                technicalPriority: phase.technical_priorities || 'Sin prioridades definidas',
                kpiTarget: phase.kpi_target || 'Sin KPI definido',
                kpiCurrent: undefined // TODO: Calculate from match statistics
            }
        } catch (error) {
            console.error('[teamStatsService] Error in getCurrentPhase:', error)
            return null
        }
    },

    /**
     * Get recent activity for a team (last training, last match, next match)
     */
    getRecentActivity: async (teamId: string, seasonId: string): Promise<RecentActivity> => {
        try {
            // Get last 10 matches (to find last played and next upcoming)
            const { data: matches, error: matchesError } = await supabase
                .from('matches')
                .select('*')
                .eq('team_id', teamId)
                .eq('season_id', seasonId)
                .order('match_date', { ascending: false })
                .limit(10)

            if (matchesError) {
                console.error('[teamStatsService] Error fetching matches:', matchesError)
            }

            const now = new Date()
            const pastMatches = matches?.filter(m => new Date(m.match_date) <= now) || []
            const futureMatches = matches?.filter(m => new Date(m.match_date) > now) || []

            const lastMatch = pastMatches[0]
            const nextMatch = futureMatches[futureMatches.length - 1] // Closest upcoming

            let lastMatchInfo = null
            if (lastMatch) {
                // Determine result
                let result: 'win' | 'loss' | 'draw' = 'draw'
                let score = '-'

                if (lastMatch.local_team_id === teamId) {
                    if (lastMatch.local_score > lastMatch.visitor_score) result = 'win'
                    else if (lastMatch.local_score < lastMatch.visitor_score) result = 'loss'
                    score = `${lastMatch.local_score}-${lastMatch.visitor_score}`
                } else {
                    if (lastMatch.visitor_score > lastMatch.local_score) result = 'win'
                    else if (lastMatch.visitor_score < lastMatch.local_score) result = 'loss'
                    score = `${lastMatch.visitor_score}-${lastMatch.local_score}`
                }

                const opponentId = lastMatch.local_team_id === teamId ? lastMatch.visitor_team_id : lastMatch.local_team_id
                let opponentName = 'Equipo desconocido'

                if (opponentId) {
                    // Get opponent name
                    const { data: opponentTeam } = await supabase
                        .from('teams')
                        .select('name')
                        .eq('id', opponentId)
                        .single()

                    if (opponentTeam) opponentName = opponentTeam.name
                }

                lastMatchInfo = {
                    date: lastMatch.match_date,
                    opponent: opponentName,
                    result,
                    score
                }
            }

            let nextMatchInfo = null
            if (nextMatch) {
                const opponentId = nextMatch.local_team_id === teamId ? nextMatch.visitor_team_id : nextMatch.local_team_id
                let opponentName = 'Equipo desconocido'

                if (opponentId) {
                    const { data: opponentTeam } = await supabase
                        .from('teams')
                        .select('name')
                        .eq('id', opponentId)
                        .single()

                    if (opponentTeam) opponentName = opponentTeam.name
                }

                nextMatchInfo = {
                    date: nextMatch.match_date,
                    opponent: opponentName
                }
            }

            return {
                lastTraining: null, // TODO: Implement when training_sessions table exists
                lastMatch: lastMatchInfo,
                nextMatch: nextMatchInfo
            }
        } catch (error) {
            console.error('[teamStatsService] Error in getRecentActivity:', error)
            return {
                lastTraining: null,
                lastMatch: null,
                nextMatch: null
            }
        }
    },

    /**
     * Get aggregated team statistics
     */
    getTeamStats: async (_teamId: string, _seasonId: string): Promise<TeamStats> => {
        try {
            // TODO: Implement real statistics aggregation from match_statistics
            // For now, return mock data
            return {
                attendanceAverage: 0,
                pointsErrorRatio: 0,
                receptionEffectiveness: 0
            }
        } catch (error) {
            console.error('[teamStatsService] Error in getTeamStats:', error)
            return {
                attendanceAverage: 0,
                pointsErrorRatio: 0,
                receptionEffectiveness: 0
            }
        }
    }
}
