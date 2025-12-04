import { supabase } from '@/lib/supabaseClient'

export interface TeamHomeSummary {
    teamId: string
    attendance: number | null  // percentage
    lastMatchText: string | null
    pointsErrorRatio: number | null
    nextEvent: {
        type: 'match' | 'training'
        label: string
        date: string
    } | null
    alerts: Array<{
        id: string
        type: 'warning' | 'info'
        message: string
    }>
}

export const teamStatsService = {
    /**
     * Get comprehensive home page summary for a team
     */
    async getTeamHomeSummary(teamId: string): Promise<TeamHomeSummary> {
        const [attendance, lastMatch, nextEvent, alerts] = await Promise.all([
            this.getTeamAttendance(teamId, 30),
            this.getLastMatchSummary(teamId),
            this.getNextEvent(teamId),
            this.getTeamAlerts(teamId)
        ])

        return {
            teamId,
            attendance,
            lastMatchText: lastMatch,
            pointsErrorRatio: null, // TODO: Implement when match stats are available
            nextEvent,
            alerts
        }
    },

    /**
     * Calculate team attendance percentage for last N days
     */
    async getTeamAttendance(_teamId: string, _days: number = 30): Promise<number | null> {
        // TODO: Implement when training attendance tracking is available
        // For now, return null
        return null
    },

    /**
     * Get summary text of last match
     */
    async getLastMatchSummary(teamId: string): Promise<string | null> {
        try {
            const { data, error } = await supabase
                .from('matches')
                .select('match_date, opponent_name, result, home_away')
                .eq('team_id', teamId)
                .eq('status', 'finished')
                .order('match_date', { ascending: false })
                .limit(1)
                .single()

            if (error || !data) return null

            const location = data.home_away === 'home' ? 'Local' : 'Visitante'
            const result = data.result || 'Sin resultado'

            return `${location} vs ${data.opponent_name} - ${result}`
        } catch (error) {
            console.error('Error fetching last match:', error)
            return null
        }
    },

    /**
     * Get next upcoming event (training or match)
     */
    async getNextEvent(teamId: string): Promise<TeamHomeSummary['nextEvent']> {
        try {
            // Get next match
            const { data: nextMatch } = await supabase
                .from('matches')
                .select('match_date, opponent_name, location, home_away')
                .eq('team_id', teamId)
                .in('status', ['planned', 'in_progress'])
                .gte('match_date', new Date().toISOString())
                .order('match_date', { ascending: true })
                .limit(1)
                .single()

            if (nextMatch) {
                const matchDate = new Date(nextMatch.match_date)
                const dateStr = matchDate.toLocaleDateString('es-ES', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                })
                const timeStr = matchDate.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                })
                const location = nextMatch.location || 'Por definir'

                return {
                    type: 'match',
                    label: `Partido vs ${nextMatch.opponent_name} - ${dateStr} ${timeStr} · ${location}`,
                    date: nextMatch.match_date
                }
            }

            // TODO: Check for next training when training system is implemented

            return null
        } catch (error) {
            console.error('Error fetching next event:', error)
            return null
        }
    },

    /**
     * Get team alerts (low attendance, pending evaluations, etc.)
     */
    async getTeamAlerts(teamId: string): Promise<TeamHomeSummary['alerts']> {
        const alerts: TeamHomeSummary['alerts'] = []

        try {
            // Check for pending evaluations
            const { data: evaluations } = await supabase
                .from('player_team_season_evaluations')
                .select('id, phase')
                .eq('team_id', teamId)

            // Check if mid-season evaluations are missing
            const currentMonth = new Date().getMonth()
            const isMidSeason = currentMonth >= 2 && currentMonth <= 4 // March to May

            if (isMidSeason && evaluations) {
                const hasMidEval = evaluations.some(e => e.phase === 'mid')
                if (!hasMidEval) {
                    alerts.push({
                        id: 'mid-eval-pending',
                        type: 'warning',
                        message: 'Evaluaciones de mitad de temporada pendientes'
                    })
                }
            }

            // Check for upcoming matches without roster
            const { data: upcomingMatches } = await supabase
                .from('matches')
                .select('id, match_date, opponent_name')
                .eq('team_id', teamId)
                .eq('status', 'planned')
                .gte('match_date', new Date().toISOString())
                .lte('match_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
                .order('match_date', { ascending: true })
                .limit(1)

            if (upcomingMatches && upcomingMatches.length > 0) {
                const match = upcomingMatches[0]
                const matchDate = new Date(match.match_date)
                const daysUntil = Math.ceil((matchDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

                alerts.push({
                    id: 'upcoming-match',
                    type: 'info',
                    message: `Partido vs ${match.opponent_name} en ${daysUntil} día${daysUntil !== 1 ? 's' : ''}`
                })
            }

        } catch (error) {
            console.error('Error fetching team alerts:', error)
        }

        return alerts
    },

    /**
     * Get the number of active players in a team for a season
     */
    async getActivePlayersCount(teamId: string, seasonId: string): Promise<number> {
        const { data, error } = await supabase
            .from('player_team_season')
            .select('id')
            .eq('team_id', teamId)
            .eq('season_id', seasonId)

        if (error) {
            console.error('Error fetching active players count:', error)
            return 0
        }

        return data?.length || 0
    },

    /**
     * Get attendance percentage for last 30 days
     * Returns percentage rounded to integer or null if no data
     */
    async getAttendanceLast30Days(_teamId: string, _seasonId: string): Promise<number | null> {
        // TODO: Implement when training attendance tracking is available
        // This would query a trainings table and calculate average attendance
        // For now, return null
        return null
    },

    /**
     * Get win/loss record for a team in a season
     */
    async getWinLossRecord(teamId: string, seasonId: string): Promise<{ wins: number, losses: number }> {
        const { data: matches, error } = await supabase
            .from('matches')
            .select('id, result, status')
            .eq('team_id', teamId)
            .eq('season_id', seasonId)
            .eq('status', 'finished')

        if (error) {
            console.error('Error fetching match results:', error)
            return { wins: 0, losses: 0 }
        }

        if (!matches || matches.length === 0) {
            return { wins: 0, losses: 0 }
        }

        let wins = 0
        let losses = 0

        // Parse results (format: "3-1", "3-0", etc.)
        matches.forEach(match => {
            if (match.result) {
                const parts = match.result.split('-')
                if (parts.length === 2) {
                    const teamSets = parseInt(parts[0])
                    const opponentSets = parseInt(parts[1])
                    if (!isNaN(teamSets) && !isNaN(opponentSets)) {
                        if (teamSets > opponentSets) {
                            wins++
                        } else {
                            losses++
                        }
                    }
                }
            }
        })

        return { wins, losses }
    }
}
