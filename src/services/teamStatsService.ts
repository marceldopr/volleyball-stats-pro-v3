import { supabase } from '@/lib/supabaseClient'

export interface TeamHomeSummary {
    teamId: string
    attendance: number | null  // percentage
    rosterCount: number  // Active players count
    availableCount: number  // Players available (placeholder - same as rosterCount for now)
    unavailableCount: number  // Players unavailable (placeholder - 0 for now)
    injuryCount: number  // Players injured (placeholder - 0 for now)
    lastActivityDays: number | null  // Days since last confirmed training
    nextEvent: {
        type: 'match' | 'training'
        label: string
        date: string
    } | null
    recentActivity: {
        lastTraining: { date: string; confirmed: boolean } | null
        lastMatch: { date: string; result: string } | null
    }
    alerts: Array<{
        id: string
        type: 'warning' | 'info'
        message: string
    }>
}

export interface PlayerAggregatedStats {
    playerId: string
    playerName: string
    number: number
    position: string
    matchesPlayed: number
    setsPlayed: number
    points: {
        total: number
        attack: number
        serve: number
        block: number
    }
    errors: {
        total: number
        attack: number
        serve: number
        block: number
        reception: number
    }
    volume: {
        total: number
        percentage: number
    }
    ratios: {
        pointsPerMatch: number
        errorsPerMatch: number
        pointsErrorRatio: number
    }
    serves: number
    receptions: number
    percentageOfTeamPoints: number
    percentageOfTeamErrors: number
    actionsPerSet: number
    impact: number
}

export interface TeamEvolutionData {
    matchId: string
    date: string
    opponent: string
    result: string
    setsWon?: number
    setsLost?: number
    stats: {
        pointsPerSet: number
        errorsPerSet: number
        pointsErrorRatio: number
    }
}

export interface TeamKPIs {
    errorsPerSet: number
    ownPointsPercentage: number
    givenPointsPercentage: number
    totalOwnPoints: number
    totalGivenPoints: number
    totalSets: number
    totalOpponentErrors?: number // Explicit count of opponent errors
}

export interface ServeEfficiencyStats {
    playerId: string
    playerName: string
    aces: number
    serveErrors: number
    servesExecuted: number
    efficiency: number
}

export interface PositionStats {
    position: string
    points: number
    errors: number
    ratio: number
    volume: number
    percentageOfTeamPoints: number
}

export interface AttendanceEvolutionPoint {
    date: string                // Format: 'YYYY-MM-DD' (ISO date only)
    attendancePercentage: number // 0–100, rounded
    trainingsCount: number       // Number of trainings on that day
}

export const teamStatsService = {
    /**
     * Get comprehensive home page summary for a team
     */
    async getTeamHomeSummary(teamId: string, seasonId?: string): Promise<TeamHomeSummary> {
        // Use provided seasonId or try to get current season
        let resolvedSeasonId = seasonId || ''

        if (!resolvedSeasonId) {
            // Strategy 1: Try to get season marked as current
            const { data: currentSeason } = await supabase
                .from('seasons')
                .select('id, name')
                .eq('is_current', true)
                .single()

            if (currentSeason) {
                resolvedSeasonId = currentSeason.id
            } else {
                // Strategy 2: Get most recent season (by name descending, assuming format like "2025/2026")
                const { data: recentSeason } = await supabase
                    .from('seasons')
                    .select('id, name')
                    .order('name', { ascending: false })
                    .limit(1)
                    .single()

                if (recentSeason) {
                    resolvedSeasonId = recentSeason.id
                }
            }
        }

        const [attendance, rosterCount, lastActivityDays, nextEvent, recentActivity, alerts] = await Promise.all([
            this.getTeamAttendance(teamId, 30),
            this.getRosterCount(teamId, resolvedSeasonId),
            this.getLastActivityDays(teamId),
            this.getNextEvent(teamId),
            this.getRecentActivity(teamId),
            this.getTeamAlerts(teamId)
        ])

        return {
            teamId,
            attendance,
            rosterCount,
            availableCount: rosterCount, // Placeholder - no real available/unavailable data yet
            unavailableCount: 0, // Placeholder
            injuryCount: 0, // Placeholder - no injury data source
            lastActivityDays,
            nextEvent,
            recentActivity,
            alerts
        }
    },

    /**
     * Get active roster count for a team
     */
    async getRosterCount(teamId: string, seasonId: string): Promise<number> {
        try {
            // If no seasonId provided, get count without season filter
            if (!seasonId) {
                const { data, error } = await supabase
                    .from('player_team_season')
                    .select('id')
                    .eq('team_id', teamId)

                if (error) {
                    return 0
                }

                return data?.length || 0
            }

            // Normal case with seasonId
            const { data, error } = await supabase
                .from('player_team_season')
                .select('id')
                .eq('team_id', teamId)
                .eq('season_id', seasonId)

            if (error) {
                return 0
            }

            return data?.length || 0
        } catch (error) {
            return 0
        }
    },

    /**
     * BULK: Get roster counts for multiple teams
     */
    async getRosterCountForTeams(teamIds: string[], seasonId: string): Promise<Map<string, number>> {
        const resultMap = new Map<string, number>()
        if (!teamIds.length) return resultMap

        const { data } = await supabase
            .from('player_team_season')
            .select('team_id')
            .in('team_id', teamIds)
            .eq('season_id', seasonId)

        data?.forEach(p => {
            const count = resultMap.get(p.team_id) || 0
            resultMap.set(p.team_id, count + 1)
        })

        return resultMap
    },

    /**
     * BULK: Get attendance (last 30d) for multiple teams
     */
    async getAttendanceLast30DaysForTeams(teamIds: string[]): Promise<Map<string, number | null>> {
        const resultMap = new Map<string, number | null>()
        if (!teamIds.length) return resultMap

        const startDate = new Date()
        startDate.setDate(startDate.getDate() - 30)

        // 1. Get recent trainings for all teams
        const { data: trainings } = await supabase
            .from('trainings')
            .select('id, team_id')
            .in('team_id', teamIds)
            .gte('date', startDate.toISOString())

        if (!trainings || trainings.length === 0) return resultMap

        const trainingIds = trainings.map(t => t.id)

        // 2. Get attendance records
        const { data: attendance } = await supabase
            .from('training_attendance')
            .select('training_id, status')
            .in('training_id', trainingIds)

        const trainingStats = new Map<string, { total: number, present: number }>()
        attendance?.forEach(a => {
            const s = trainingStats.get(a.training_id) || { total: 0, present: 0 }
            s.total++
            if (a.status === 'present' || a.status === 'justified') s.present++
            trainingStats.set(a.training_id, s)
        })

        // 3. Aggregate per team
        teamIds.forEach(tid => {
            const teamTrainings = trainings.filter(t => t.team_id === tid)
            if (teamTrainings.length === 0) {
                resultMap.set(tid, null)
                return
            }

            let tTotal = 0
            let tPresent = 0
            teamTrainings.forEach(t => {
                const s = trainingStats.get(t.id)
                if (s) {
                    tTotal += s.total
                    tPresent += s.present
                }
            })

            resultMap.set(tid, tTotal > 0 ? Math.round((tPresent / tTotal) * 100) : null)
        })

        return resultMap
    },

    /**
     * BULK: Get Win/Loss records for multiple teams
     */
    async getWinLossRecordForTeams(_teamIds: string[], _seasonId: string): Promise<Map<string, { wins: number, losses: number }>> {
        const resultMap = new Map<string, { wins: number, losses: number }>()
        // TODO: Implement bulk stats logic when needed
        // const { data: matches } = await supabase
        //     .from('matches')
        //     .select('team_id, sets_home, sets_away, winner, status, home_away')
        //     .in('team_id', _teamIds)
        //     .eq('season_id', _seasonId)
        //     .eq('status', 'finished')
        // Process matches and populate resultMap
        return resultMap
    },

    /**
     * Get days since last confirmed training
     */
    async getLastActivityDays(teamId: string): Promise<number | null> {
        try {
            const { data, error } = await supabase
                .from('trainings')
                .select('date, training_attendance!inner(id)')
                .eq('team_id', teamId)
                .order('date', { ascending: false })
                .limit(1)
                .single()

            if (error || !data) return null

            const lastDate = new Date(data.date)
            const now = new Date()
            const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

            return daysSince
        } catch (error) {
            console.error('Error getting last activity:', error)
            return null
        }
    },

    /**
     * Get recent activity summary (last training and last match)
     */
    async getRecentActivity(teamId: string): Promise<TeamHomeSummary['recentActivity']> {
        try {
            // Get last training with attendance
            const { data: lastTraining } = await supabase
                .from('trainings')
                .select('date, training_attendance!inner(id)')
                .eq('team_id', teamId)
                .order('date', { ascending: false })
                .limit(1)
                .single()

            // Get last finished match
            const { data: lastMatch } = await supabase
                .from('matches')
                .select('match_date, result')
                .eq('team_id', teamId)
                .eq('status', 'finished')
                .order('match_date', { ascending: false })
                .limit(1)
                .single()

            return {
                lastTraining: lastTraining ? {
                    date: lastTraining.date,
                    confirmed: true
                } : null,
                lastMatch: lastMatch ? {
                    date: lastMatch.match_date,
                    result: lastMatch.result || 'Sin resultado'
                } : null
            }
        } catch (error) {
            console.error('Error getting recent activity:', error)
            return {
                lastTraining: null,
                lastMatch: null
            }
        }
    },


    /**
     * Calculate points/errors ratio for the team based on recent matches
     * Now uses server-side calculation via Postgres function
     */
    async getPointsErrorsRatio(teamId: string, limit: number = 5): Promise<number | null> {
        try {
            // Fetch last N matches with their actions
            const { data: matches, error } = await supabase
                .from('matches')
                .select('actions')
                .eq('team_id', teamId)
                .order('match_date', { ascending: false })
                .limit(limit)

            if (error) {
                console.error('Error fetching matches for ratio:', error)
                return null
            }

            if (!matches || matches.length === 0) {
                return null
            }

            let totalPoints = 0
            let totalErrors = 0

            matches.forEach(match => {
                if (match.actions && Array.isArray(match.actions)) {
                    match.actions.forEach((action: any) => {
                        // Count Earned Points (Performance)
                        if (action.type === 'POINT_US') {
                            const reason = action.payload?.reason
                            if (['attack_point', 'serve_point', 'block_point'].includes(reason)) {
                                totalPoints++
                            }
                        }
                        // Count Unforced Errors (Points given to opponent)
                        else if (action.type === 'POINT_OPPONENT') {
                            const reason = action.payload?.reason
                            if (['service_error', 'attack_error', 'reception_error', 'block_error', 'setting_error'].includes(reason)) {
                                totalErrors++
                            }
                        }
                    })
                }
            })

            // If no points and no errors, return null
            if (totalPoints === 0 && totalErrors === 0) {
                return null
            }

            // If no errors but there are points, return total points (infinite ratio)
            if (totalErrors === 0) {
                return totalPoints > 0 ? totalPoints : null
            }

            // Calculate and return ratio
            return parseFloat((totalPoints / totalErrors).toFixed(2))

        } catch (error) {
            console.error('Error calculating points/error ratio:', error)
            return null
        }
    },

    /**
     * Calculate team attendance percentage for last N days
     */
    async getTeamAttendance(teamId: string, days: number = 30): Promise<number | null> {
        try {
            // 1. Get trainings in the date range
            const startDate = new Date()
            startDate.setDate(startDate.getDate() - days)

            const { data: trainings, error: trainingError } = await supabase
                .from('trainings')
                .select('id')
                .eq('team_id', teamId)
                .gte('date', startDate.toISOString())
                .lte('date', new Date().toISOString())

            if (trainingError || !trainings || trainings.length === 0) {
                return null
            }

            const trainingIds = trainings.map(t => t.id)

            // 2. Get attendance records for these trainings
            const { data: attendance, error: attendanceError } = await supabase
                .from('training_attendance')
                .select('status')
                .in('training_id', trainingIds)

            if (attendanceError || !attendance || attendance.length === 0) {
                return null
            }

            // 3. Calculate percentage
            // Valid attendance: 'present' or 'justified'
            const validAttendance = attendance.filter(
                r => r.status === 'present' || r.status === 'justified'
            ).length

            const totalRecords = attendance.length

            if (totalRecords === 0) return null

            return Math.round((validAttendance / totalRecords) * 100)

        } catch (error) {
            console.error('Error calculating team attendance:', error)
            return null
        }
    },

    /**
     * Get summary text of last match
     * V2-ONLY: Uses result field, no event parsing
     */
    async getLastMatchSummary(teamId: string): Promise<string | null> {
        try {
            const { data, error } = await supabase
                .from('matches')
                .select('match_date, opponent_name, result, home_away, sets_home, sets_away')
                .eq('team_id', teamId)
                .eq('status', 'finished')

                .order('match_date', { ascending: false })
                .limit(1)
                .single()

            if (error || !data) return null

            // V2: result field is already populated correctly keys (e.g. "3-1 (25-20, 25-18, 25-22)")
            // NEW: Use sets_home/sets_away if available for robust structure
            let mySets = 0
            let oppSets = 0

            if (data.home_away === 'home') {
                mySets = data.sets_home || 0 // Default to 0? Or parse from result if 0?
                oppSets = data.sets_away || 0
            } else {
                mySets = data.sets_away || 0
                oppSets = data.sets_home || 0
            }

            // Fallback to parsing 'result' if sets are 0 (Legacy check)
            if (mySets === 0 && oppSets === 0 && data.result) {
                const clean = data.result.replace(/^Sets:\s*/i, '').split('(')[0].trim()
                const parts = clean.split('-')
                if (parts.length === 2) {
                    const p1 = parseInt(parts[0]); const p2 = parseInt(parts[1])
                    if (!isNaN(p1) && !isNaN(p2)) {
                        if (data.home_away === 'home') { mySets = p1; oppSets = p2 }
                        else { mySets = p2; oppSets = p1 }
                    }
                }
            }

            let outcome = ''
            if (mySets > oppSets) outcome = 'Victoria'
            else if (mySets < oppSets) outcome = 'Derrota'
            else outcome = 'Empate'

            let resultDisplay = data.result
            if (!resultDisplay || resultDisplay === 'Sin resultado') {
                resultDisplay = `${mySets}-${oppSets}`
            }

            const resultText = resultDisplay

            const prefix = outcome ? `${outcome} ` : ''

            return `${prefix}${resultText} vs ${data.opponent_name}`
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
            const now = new Date().toISOString()

            // 1. Get next match
            const { data: nextMatch } = await supabase
                .from('matches')
                .select('match_date, opponent_name, location, home_away')
                .eq('team_id', teamId)
                .in('status', ['planned', 'in_progress'])
                .gte('match_date', now)
                .order('match_date', { ascending: true })
                .limit(1)
                .single()

            // 2. Get next training
            const { data: nextTraining } = await supabase
                .from('trainings')
                .select('date, start_time, end_time, location')
                .eq('team_id', teamId)
                .gte('date', now)
                .order('date', { ascending: true })
                .limit(1)
                .single()

            let nextEvent = null

            // Helper to format date/time
            const formatEventDate = (date: Date) => {
                return {
                    dateStr: date.toLocaleDateString('es-ES', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                    }),
                    timeStr: date.toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                }
            }

            // Compare and select the earliest event
            let selectedEvent: 'match' | 'training' | null = null

            if (nextMatch && nextTraining) {
                const matchDate = new Date(nextMatch.match_date)
                const trainingDate = new Date(nextTraining.date)
                // If training has time, combine it
                if (nextTraining.start_time) {
                    const [hours, minutes] = nextTraining.start_time.split(':')
                    trainingDate.setHours(parseInt(hours), parseInt(minutes))
                }

                selectedEvent = matchDate < trainingDate ? 'match' : 'training'
            } else if (nextMatch) {
                selectedEvent = 'match'
            } else if (nextTraining) {
                selectedEvent = 'training'
            }

            // Format the selected event
            if (selectedEvent === 'match' && nextMatch) {
                const matchDate = new Date(nextMatch.match_date)
                const { dateStr, timeStr } = formatEventDate(matchDate)
                const location = nextMatch.location || 'Por definir'

                nextEvent = {
                    type: 'match' as const,
                    label: `Partido vs ${nextMatch.opponent_name} - ${dateStr} ${timeStr} · ${location}`,
                    date: nextMatch.match_date
                }
            } else if (selectedEvent === 'training' && nextTraining) {
                // Construct training date with time if available
                const trainingDate = new Date(nextTraining.date)
                if (nextTraining.start_time) {
                    const [hours, minutes] = nextTraining.start_time.split(':')
                    trainingDate.setHours(parseInt(hours), parseInt(minutes))
                }

                const { dateStr } = formatEventDate(trainingDate)
                const location = nextTraining.location || 'Pista entrenamiento'
                const timeDisplay = nextTraining.start_time ? ` ${nextTraining.start_time}` : ''

                nextEvent = {
                    type: 'training' as const,
                    label: `Entrenamiento - ${dateStr}${timeDisplay} · ${location}`,
                    date: trainingDate.toISOString()
                }
            }

            return nextEvent

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
    async getAttendanceLast30Days(teamId: string, _seasonId: string): Promise<number | null> {
        try {
            // Get trainings for this team in the last 30 days
            const startDate = new Date()
            startDate.setDate(startDate.getDate() - 30)

            const { data: trainings, error: trainingsError } = await supabase
                .from('trainings')
                .select('id')
                .eq('team_id', teamId)
                .gte('date', startDate.toISOString())
                .lte('date', new Date().toISOString())

            if (trainingsError) {
                console.error('[TeamStats] Error fetching trainings:', trainingsError)
                return null
            }

            if (!trainings || trainings.length === 0) {
                // No trainings in last 30 days
                return null
            }

            // Get attendance records for these trainings
            const trainingIds = trainings.map(t => t.id)
            const { data: attendance, error: attendanceError } = await supabase
                .from('training_attendance')
                .select('status')
                .in('training_id', trainingIds)

            if (attendanceError) {
                console.error('[TeamStats] Error fetching attendance:', attendanceError)
                return null
            }

            if (!attendance || attendance.length === 0) {
                // No attendance records
                return null
            }

            // Calculate percentage: (present + justified) / total
            const validAttendance = attendance.filter(
                r => r.status === 'present' || r.status === 'justified'
            ).length
            const percentage = Math.round((validAttendance / attendance.length) * 100)

            return percentage
        } catch (error) {
            console.error('[TeamStats] Error in getAttendanceLast30Days:', error)
            return null
        }
    },

    /**
     * Get attendance evolution over a date range, grouped by day
     * @param teamId Team ID
     * @param startDate Start date (inclusive)
     * @param endDate End date (inclusive)
     * @returns Array of daily attendance percentages, ordered by date ascending
     */
    async getAttendanceEvolution(
        teamId: string,
        startDate: Date,
        endDate: Date
    ): Promise<AttendanceEvolutionPoint[]> {
        try {
            // 1. Get all trainings for this team in the date range
            const { data: trainings, error: trainingsError } = await supabase
                .from('trainings')
                .select('id, date')
                .eq('team_id', teamId)
                .gte('date', startDate.toISOString())
                .lte('date', endDate.toISOString())
                .order('date', { ascending: true })

            if (trainingsError) {
                console.error('[TeamStats] Error fetching trainings for evolution:', trainingsError)
                return []
            }

            if (!trainings || trainings.length === 0) {
                // No trainings in this date range
                return []
            }

            // 2. Get all attendance records for these trainings
            const trainingIds = trainings.map(t => t.id)
            const { data: attendance, error: attendanceError } = await supabase
                .from('training_attendance')
                .select('training_id, status')
                .in('training_id', trainingIds)

            if (attendanceError) {
                console.error('[TeamStats] Error fetching attendance for evolution:', attendanceError)
                return []
            }

            // 3. Group trainings and attendance by day (date only, no time)
            const dayMap = new Map<string, {
                trainingIds: Set<string>;
                attendanceRecords: Array<{ status: string }>;
            }>()

            // Helper function to get local date key (YYYY-MM-DD in local timezone)
            function getLocalDateKey(dateString: string): string {
                const d = new Date(dateString)
                const year = d.getFullYear()
                const month = String(d.getMonth() + 1).padStart(2, '0')
                const day = String(d.getDate()).padStart(2, '0')
                return `${year}-${month}-${day}` // YYYY-MM-DD en hora local
            }

            // First, group trainings by day (using local date)
            trainings.forEach(training => {
                const dateOnly = getLocalDateKey(training.date)
                if (!dayMap.has(dateOnly)) {
                    dayMap.set(dateOnly, {
                        trainingIds: new Set(),
                        attendanceRecords: []
                    })
                }
                dayMap.get(dateOnly)!.trainingIds.add(training.id)
            })

            // Then, assign attendance records to their corresponding days
            if (attendance && attendance.length > 0) {
                attendance.forEach(record => {
                    // Find which day this training belongs to
                    for (const [_day, data] of dayMap.entries()) {
                        if (data.trainingIds.has(record.training_id)) {
                            data.attendanceRecords.push({ status: record.status })
                            break
                        }
                    }
                })
            }

            // 4. Calculate attendance percentage for each day
            const result = Array.from(dayMap.entries()).map(([date, data]) => {
                const totalRecords = data.attendanceRecords.length

                // If there are trainings but no attendance records, return 0%
                const attendancePercentage = totalRecords > 0
                    ? Math.round(
                        (data.attendanceRecords.filter(r => r.status === 'present' || r.status === 'justified').length / totalRecords) * 100
                    )
                    : 0

                return {
                    date,
                    attendancePercentage,
                    trainingsCount: data.trainingIds.size
                }
            })

            // 5. Sort by date ascending (already sorted from query, but ensure it)
            result.sort((a, b) => a.date.localeCompare(b.date))

            return result

        } catch (error) {
            console.error('[TeamStats] Error in getAttendanceEvolution:', error)
            return []
        }
    },

    /**
     * Get win/loss record for a team in a season
     * V2: Uses structured columns (sets_home, sets_away, points_home, points_away)
     */
    async getWinLossRecord(teamId: string, seasonId: string): Promise<{ wins: number, losses: number, setsWon: number, setsLost: number, pointsScored: number, pointsLost: number }> {
        const { data: matches, error } = await supabase
            .from('matches')
            .select('id, sets_home, sets_away, points_home, points_away, winner, status, home_away')
            .eq('team_id', teamId)
            .eq('season_id', seasonId)
            .eq('status', 'finished')


        if (error) {
            console.error('Error fetching match results:', error)
            return { wins: 0, losses: 0, setsWon: 0, setsLost: 0, pointsScored: 0, pointsLost: 0 }
        }

        if (!matches || matches.length === 0) {
            return { wins: 0, losses: 0, setsWon: 0, setsLost: 0, pointsScored: 0, pointsLost: 0 }
        }

        let wins = 0
        let losses = 0
        let setsWon = 0
        let setsLost = 0
        let pointsScored = 0
        let pointsLost = 0

        // Use structured data from new columns
        matches.forEach(match => {
            // Determine team's perspective based on home_away
            let mySets, oppSets, myPoints, oppPoints

            if (match.home_away === 'home') {
                // My team played at home
                mySets = match.sets_home || 0
                oppSets = match.sets_away || 0
                myPoints = match.points_home || 0
                oppPoints = match.points_away || 0
            } else {
                // My team played away
                mySets = match.sets_away || 0
                oppSets = match.sets_home || 0
                myPoints = match.points_away || 0
                oppPoints = match.points_home || 0
            }

            setsWon += mySets
            setsLost += oppSets
            pointsScored += myPoints
            pointsLost += oppPoints

            // Determine win/loss
            if (mySets > oppSets) {
                wins++
            } else if (mySets < oppSets) {
                losses++
            }
        })

        return { wins, losses, setsWon, setsLost, pointsScored, pointsLost }
    },

    /**
     * Get aggregated player stats for a team/season
     */
    async getTeamPlayerStats(teamId: string, seasonId: string, lastMatchesCount?: number): Promise<PlayerAggregatedStats[]> {
        try {
            // First, get the list of finished matches for this team/season
            let matchQuery = supabase
                .from('matches')
                .select('id, match_date')
                .eq('team_id', teamId)
                .eq('season_id', seasonId)
                .eq('status', 'finished')
                .order('match_date', { ascending: false })

            if (lastMatchesCount) {
                matchQuery = matchQuery.limit(lastMatchesCount)
            }

            const { data: matches, error: matchError } = await matchQuery

            if (matchError) throw matchError
            if (!matches || matches.length === 0) return []

            const matchIds = matches.map(m => m.id)

            // Now query match_player_set_stats for these matches
            const { data: statsData, error: statsError } = await supabase
                .from('match_player_set_stats')
                .select('*')
                .in('match_id', matchIds)
                .eq('team_id', teamId)
                .eq('season_id', seasonId)

            if (statsError) {
                console.error('[TeamStats] Error fetching stats:', statsError)
                throw statsError
            }
            if (!statsData || statsData.length === 0) {
                return []
            }

            // Get unique player IDs
            const playerIds = [...new Set(statsData.map(s => s.player_id))]

            // Fetch player data from club_players (basic info only)
            const { data: playersData, error: playersError } = await supabase
                .from('club_players')
                .select('id, first_name, last_name, main_position')
                .in('id', playerIds)

            if (playersError) {
                console.error('[TeamStats] Error fetching players:', playersError)
                throw playersError
            }

            // Fetch jersey numbers from player_team_season
            const { data: jerseyData, error: jerseyError } = await supabase
                .from('player_team_season')
                .select('player_id, jersey_number')
                .eq('team_id', teamId)
                .eq('season_id', seasonId)
                .in('player_id', playerIds)

            if (jerseyError) {
                console.error('[TeamStats] Error fetching jersey numbers:', jerseyError)
            }

            // Create jersey map
            const jerseyMap = new Map<string, string>()
            jerseyData?.forEach(j => {
                jerseyMap.set(j.player_id, j.jersey_number)
            })

            // Create a map of player data
            const playersMap = new Map()
            playersData?.forEach(p => {
                playersMap.set(p.id, {
                    id: p.id,
                    name: `${p.first_name} ${p.last_name}`,
                    number: parseInt(jerseyMap.get(p.id) || '0'),
                    position: p.main_position || '?'
                })
            })

            const playerStatsMap = new Map<string, PlayerAggregatedStats>()
            let teamTotalVolume = 0
            const playerMatchesPlayed = new Map<string, Set<string>>()

            // Aggregate stats from match_player_set_stats
            statsData.forEach(stat => {
                const playerData = playersMap.get(stat.player_id)
                if (!playerData) {
                    console.warn(`[TeamStats] Player not found: ${stat.player_id}`)
                    return
                }

                const playerId = stat.player_id

                // Track matches played per player
                if (!playerMatchesPlayed.has(playerId)) {
                    playerMatchesPlayed.set(playerId, new Set())
                }
                playerMatchesPlayed.get(playerId)!.add(stat.match_id)

                if (!playerStatsMap.has(playerId)) {
                    playerStatsMap.set(playerId, {
                        playerId: playerId,
                        playerName: playerData.name,
                        number: playerData.number,
                        position: playerData.position,
                        matchesPlayed: 0,
                        setsPlayed: 0,
                        points: { total: 0, attack: 0, serve: 0, block: 0 },
                        errors: { total: 0, attack: 0, serve: 0, block: 0, reception: 0 },
                        volume: { total: 0, percentage: 0 },
                        ratios: { pointsPerMatch: 0, errorsPerMatch: 0, pointsErrorRatio: 0 },
                        serves: 0,
                        receptions: 0,
                        percentageOfTeamPoints: 0,
                        percentageOfTeamErrors: 0,
                        actionsPerSet: 0,
                        impact: 0
                    })
                }

                const playerStats = playerStatsMap.get(playerId)!
                playerStats.setsPlayed++

                // Points
                playerStats.points.attack += stat.kills || 0
                playerStats.points.serve += stat.aces || 0
                playerStats.points.block += stat.blocks || 0
                playerStats.points.total += (stat.kills || 0) + (stat.aces || 0) + (stat.blocks || 0)

                // Errors
                playerStats.errors.attack += stat.attack_errors || 0
                playerStats.errors.serve += stat.serve_errors || 0
                playerStats.errors.block += stat.block_errors || 0
                playerStats.errors.reception += stat.reception_errors || 0
                playerStats.errors.total += (stat.attack_errors || 0) + (stat.serve_errors || 0) + (stat.block_errors || 0) + (stat.reception_errors || 0)

                // Volume (Total actions)
                const volume = (stat.attacks || 0) + (stat.serves || 0) + (stat.receptions || 0) + (stat.blocks || 0)
                playerStats.volume.total += volume
                teamTotalVolume += volume

                // Serves count
                playerStats.serves += stat.serves || 0

                // Receptions count
                playerStats.receptions += stat.receptions || 0
            })

            // Update matches played count
            playerMatchesPlayed.forEach((matchSet, playerId) => {
                const stats = playerStatsMap.get(playerId)
                if (stats) {
                    stats.matchesPlayed = matchSet.size
                }
            })

            // Calculate ratios and percentages
            let teamTotalPoints = 0
            let teamTotalErrors = 0

            // First pass: sum team totals
            playerStatsMap.forEach(stats => {
                teamTotalPoints += stats.points.total
                teamTotalErrors += stats.errors.total
            })

            // Second pass: calculate all derived fields
            const result = Array.from(playerStatsMap.values()).map(stats => {
                stats.volume.percentage = teamTotalVolume > 0 ? (stats.volume.total / teamTotalVolume) * 100 : 0
                stats.ratios.pointsPerMatch = stats.matchesPlayed > 0 ? stats.points.total / stats.matchesPlayed : 0
                stats.ratios.errorsPerMatch = stats.matchesPlayed > 0 ? stats.errors.total / stats.matchesPlayed : 0
                stats.ratios.pointsErrorRatio = stats.errors.total > 0 ? stats.points.total / stats.errors.total : stats.points.total

                // New calculated fields
                stats.percentageOfTeamPoints = teamTotalPoints > 0 ? (stats.points.total / teamTotalPoints) * 100 : 0
                stats.percentageOfTeamErrors = teamTotalErrors > 0 ? (stats.errors.total / teamTotalErrors) * 100 : 0
                stats.actionsPerSet = stats.setsPlayed > 0 ? stats.volume.total / stats.setsPlayed : 0
                stats.impact = stats.points.total - stats.errors.total

                return stats
            })

            return result

        } catch (error) {
            console.error('Error fetching team player stats:', error)
            return []
        }
    },

    /**
     * Get team evolution stats for graph
     */
    async getTeamStatsEvolution(teamId: string, seasonId: string, lastMatchesCount?: number): Promise<TeamEvolutionData[]> {
        try {
            // 1. Get confirmed finished matches
            const { data: matches, error } = await supabase
                .from('matches')
                .select('id, match_date, opponent_name, result, sets_home, sets_away, home_away')
                .eq('team_id', teamId)
                .eq('season_id', seasonId)
                .eq('status', 'finished')
                .order('match_date', { ascending: false })

            if (error) throw error
            if (!matches || matches.length === 0) return []

            let matchesToProcess = matches
            if (lastMatchesCount) {
                matchesToProcess = matches.slice(0, lastMatchesCount)
            }

            // Reverse to chronological order
            matchesToProcess.reverse()
            const matchIds = matchesToProcess.map(m => m.id)

            // 2. Get stats for these matches
            const { data: statsData, error: statsError } = await supabase
                .from('match_player_set_stats')
                .select('match_id, kills, aces, blocks, attack_errors, serve_errors, block_errors, reception_errors')
                .in('match_id', matchIds)
                .eq('team_id', teamId)

            if (statsError) {
                console.error('Error fetching stats for evolution:', statsError)
                return []
            }

            // 3. Aggregate per match
            const matchStatsMap = new Map<string, { points: number, errors: number }>()

            statsData?.forEach(stat => {
                const current = matchStatsMap.get(stat.match_id) || { points: 0, errors: 0 }

                const points = (stat.kills || 0) + (stat.aces || 0) + (stat.blocks || 0)
                const errors = (stat.attack_errors || 0) + (stat.serve_errors || 0) + (stat.block_errors || 0) + (stat.reception_errors || 0)

                current.points += points
                current.errors += errors
                matchStatsMap.set(stat.match_id, current)
            })

            // 4. Build Result
            return matchesToProcess.map(match => {
                const stats = matchStatsMap.get(match.id) || { points: 0, errors: 0 }

                // Determine sets played
                let setsPlayed = 1 // avoid division by zero
                let setsWon = 0
                let setsLost = 0

                // Attempt to use structured data first
                // If the sum is > 0, we assume new data is present (or at least one set finished)
                // However, for pure legacy, 0-0 might mean empty. We check legacy string if 0-0.
                const hasStructuredData = (match.sets_home || 0) > 0 || (match.sets_away || 0) > 0

                if (hasStructuredData) {
                    if (match.home_away === 'home') {
                        setsWon = match.sets_home
                        setsLost = match.sets_away
                    } else {
                        setsWon = match.sets_away
                        setsLost = match.sets_home
                    }
                    setsPlayed = setsWon + setsLost
                } else if (match.result) {
                    // Fallback to legacy string parsing
                    const simpleResult = match.result.replace(/^Sets:\s*/i, '').split('(')[0].trim()
                    const parts = simpleResult.split('-')
                    if (parts.length === 2) {
                        const p1 = parseInt(parts[0]); const p2 = parseInt(parts[1])
                        if (!isNaN(p1) && !isNaN(p2)) {
                            // Can't reliably know who is who without home_away or assumption
                            // Usually format is Us-Them or Home-Away. 
                            // If we have home_away, we can guess. Legacy system usually stored "Home-Away" in result?
                            // For safety, we just sum them for 'setsPlayed'. 
                            // Result string should ideally match display.
                            setsPlayed = p1 + p2

                            // Try to deduce won/lost if possible
                            if (match.home_away === 'home') {
                                setsWon = p1; setsLost = p2;
                            } else {
                                setsWon = p2; setsLost = p1;
                            }
                        }
                    }
                }

                if (setsPlayed < 1) setsPlayed = 1

                let resultDisplay = match.result
                if (!resultDisplay || resultDisplay === 'Sin resultado') {
                    resultDisplay = `${setsWon}-${setsLost}`
                }
                if (setsPlayed === 0) setsPlayed = 1

                return {
                    matchId: match.id,
                    date: match.match_date,
                    opponent: match.opponent_name || 'Desconocido',
                    result: resultDisplay,
                    setsWon,
                    setsLost,
                    stats: {
                        pointsPerSet: parseFloat((stats.points / setsPlayed).toFixed(1)),
                        errorsPerSet: parseFloat((stats.errors / setsPlayed).toFixed(1)),
                        pointsErrorRatio: stats.errors > 0 ? parseFloat((stats.points / stats.errors).toFixed(2)) : stats.points
                    }
                }
            })

        } catch (error) {
            console.error('Error fetching team evolution:', error)
            return []
        }
    },

    /**
     * Get aggregated player stats from multiple teams
     */
    async getMultiTeamPlayerStats(teamIds: string[], seasonId: string, lastMatchesCount?: number): Promise<PlayerAggregatedStats[]> {
        try {
            // Fetch stats for all teams in parallel
            const allTeamStats = await Promise.all(
                teamIds.map(teamId => this.getTeamPlayerStats(teamId, seasonId, lastMatchesCount))
            )

            // Flatten all stats into one array
            const flattenedStats = allTeamStats.flat()

            // Group by player ID and aggregate
            const playerStatsMap = new Map<string, PlayerAggregatedStats>()
            let teamTotalVolume = 0

            flattenedStats.forEach(playerStat => {
                if (!playerStatsMap.has(playerStat.playerId)) {
                    playerStatsMap.set(playerStat.playerId, {
                        playerId: playerStat.playerId,
                        playerName: playerStat.playerName,
                        number: playerStat.number,
                        position: playerStat.position,
                        matchesPlayed: 0,
                        setsPlayed: 0,
                        points: { total: 0, attack: 0, serve: 0, block: 0 },
                        errors: { total: 0, attack: 0, serve: 0, block: 0, reception: 0 },
                        volume: { total: 0, percentage: 0 },
                        ratios: { pointsPerMatch: 0, errorsPerMatch: 0, pointsErrorRatio: 0 },
                        serves: 0,
                        receptions: 0,
                        percentageOfTeamPoints: 0,
                        percentageOfTeamErrors: 0,
                        actionsPerSet: 0,
                        impact: 0
                    })
                }

                const aggregated = playerStatsMap.get(playerStat.playerId)!

                // Aggregate counts
                aggregated.matchesPlayed += playerStat.matchesPlayed
                aggregated.setsPlayed += playerStat.setsPlayed

                // Aggregate points
                aggregated.points.attack += playerStat.points.attack
                aggregated.points.serve += playerStat.points.serve
                aggregated.points.block += playerStat.points.block
                aggregated.points.total += playerStat.points.total

                // Aggregate errors
                aggregated.errors.attack += playerStat.errors.attack
                aggregated.errors.serve += playerStat.errors.serve
                aggregated.errors.block += playerStat.errors.block
                aggregated.errors.reception += playerStat.errors.reception
                aggregated.errors.total += playerStat.errors.total

                // Aggregate volume
                aggregated.volume.total += playerStat.volume.total
                teamTotalVolume += playerStat.volume.total

                // Aggregate serves and receptions
                aggregated.serves += playerStat.serves
                aggregated.receptions += playerStat.receptions
            })

            // Recalculate ratios and percentages
            let teamTotalPoints = 0
            let teamTotalErrors = 0

            playerStatsMap.forEach(stats => {
                teamTotalPoints += stats.points.total
                teamTotalErrors += stats.errors.total
            })

            const result = Array.from(playerStatsMap.values()).map(stats => {
                stats.volume.percentage = teamTotalVolume > 0 ? (stats.volume.total / teamTotalVolume) * 100 : 0
                stats.ratios.pointsPerMatch = stats.matchesPlayed > 0 ? stats.points.total / stats.matchesPlayed : 0
                stats.ratios.errorsPerMatch = stats.matchesPlayed > 0 ? stats.errors.total / stats.matchesPlayed : 0
                stats.ratios.pointsErrorRatio = stats.errors.total > 0 ? stats.points.total / stats.errors.total : stats.points.total

                stats.percentageOfTeamPoints = teamTotalPoints > 0 ? (stats.points.total / teamTotalPoints) * 100 : 0
                stats.percentageOfTeamErrors = teamTotalErrors > 0 ? (stats.errors.total / teamTotalErrors) * 100 : 0
                stats.actionsPerSet = stats.setsPlayed > 0 ? stats.volume.total / stats.setsPlayed : 0
                stats.impact = stats.points.total - stats.errors.total

                return stats
            })

            return result

        } catch (error) {
            console.error('Error fetching multi-team player stats:', error)
            return []
        }
    },

    /**
     * Get team-level KPIs
     */
    async getTeamKPIs(teamId: string, seasonId: string, lastMatchesCount?: number): Promise<TeamKPIs> {
        try {
            const playerStats = await this.getTeamPlayerStats(teamId, seasonId, lastMatchesCount)

            // Count total sets from match_player_set_stats (more accurate than parsing result string)
            let statsQuery = supabase
                .from('match_player_set_stats')
                .select('match_id, set_number')
                .eq('team_id', teamId)
                .eq('season_id', seasonId)

            // If limiting to last N matches, get those match IDs first
            if (lastMatchesCount) {
                const { data: recentMatches } = await supabase
                    .from('matches')
                    .select('id')
                    .eq('team_id', teamId)
                    .eq('season_id', seasonId)
                    .eq('status', 'finished')
                    .order('match_date', { ascending: false })
                    .limit(lastMatchesCount)

                if (recentMatches && recentMatches.length > 0) {
                    const matchIds = recentMatches.map(m => m.id)
                    statsQuery = statsQuery.in('match_id', matchIds)
                }
            }

            const { data: setStats } = await statsQuery

            // Count unique sets (match_id + set_number combinations)
            const uniqueSets = new Set<string>()
            setStats?.forEach((stat: any) => {
                uniqueSets.add(`${stat.match_id}-${stat.set_number}`)
            })
            const totalSets = uniqueSets.size

            // Calculate totals from player stats
            const totalOwnPoints = playerStats.reduce((sum, p) => sum + p.points.total, 0)
            const totalGivenPoints = playerStats.reduce((sum, p) => sum + p.errors.total, 0)

            const errorsPerSet = totalSets > 0 ? totalGivenPoints / totalSets : 0
            const totalPoints = totalOwnPoints + totalGivenPoints
            const ownPointsPercentage = totalPoints > 0 ? (totalOwnPoints / totalPoints) * 100 : 0
            const givenPointsPercentage = totalPoints > 0 ? (totalGivenPoints / totalPoints) * 100 : 0

            return {
                errorsPerSet,
                ownPointsPercentage,
                givenPointsPercentage,
                totalOwnPoints,
                totalGivenPoints,
                totalSets
            }
        } catch (error) {
            console.error('Error fetching team KPIs:', error)
            return {
                errorsPerSet: 0,
                ownPointsPercentage: 0,
                givenPointsPercentage: 0,
                totalOwnPoints: 0,
                totalGivenPoints: 0,
                totalSets: 0
            }
        }
    },

    /**
     * Get aggregated KPIs for multiple teams/matches
     * Includes explicit 'opponent_error' count from match actions
     */
    async getMultiTeamKPIs(teamIds: string[], seasonId: string | null = null, limit: number | null = null): Promise<TeamKPIs> {
        try {
            let query = supabase
                .from('matches')
                .select('id, actions, sets_home, sets_away, home_away')
                .in('team_id', teamIds)
                .eq('status', 'finished')

            if (seasonId) {
                query = query.eq('season_id', seasonId)
            }

            if (limit) {
                query = query.order('match_date', { ascending: false }).limit(limit)
            } else {
                query = query.order('match_date', { ascending: false }) // Default order
            }

            const { data: matches, error } = await query

            if (error) throw error

            let totalOwnPoints = 0
            let totalOpponentErrors = 0
            let totalSets = 0

            matches?.forEach(match => {
                // Calculate sets
                if (match.home_away === 'home') {
                    totalSets += (match.sets_home || 0) + (match.sets_away || 0)
                } else {
                    totalSets += (match.sets_home || 0) + (match.sets_away || 0)
                }

                // Analyze actions
                if (match.actions && Array.isArray(match.actions)) {
                    match.actions.forEach((action: any) => {
                        if (action.type === 'POINT_US') {
                            const reason = action.payload?.reason
                            if (reason === 'opponent_error') {
                                totalOpponentErrors++
                            } else if (['attack_point', 'serve_point', 'block_point'].includes(reason)) {
                                totalOwnPoints++
                            }
                        }
                    })
                }
            })

            const totalPoints = totalOwnPoints + totalOpponentErrors
            // Note: We don't have "Given Points" (our errors) easily accessible without checking 'POINT_OPPONENT'

            return {
                errorsPerSet: 0, // Not calculated for now
                ownPointsPercentage: totalPoints > 0 ? (totalOwnPoints / totalPoints) * 100 : 0,
                givenPointsPercentage: 0, // Not calculated
                totalOwnPoints, // Here we use purely "Earned" points
                totalGivenPoints: 0,
                totalSets,
                totalOpponentErrors // New field, need to add to interface if not present. WAIT. Check interface.
            }
        } catch (error) {
            console.error('Error fetching multi-team KPIs:', error)
            return {
                errorsPerSet: 0,
                ownPointsPercentage: 0,
                givenPointsPercentage: 0,
                totalOwnPoints: 0,
                totalGivenPoints: 0,
                totalSets: 0
            }
        }
    },

    /**
     * Get serve efficiency stats for all players
     */
    async getServeEfficiency(teamId: string, seasonId: string, lastMatchesCount?: number): Promise<ServeEfficiencyStats[]> {
        try {
            const playerStats = await this.getTeamPlayerStats(teamId, seasonId, lastMatchesCount)

            return playerStats.map(p => ({
                playerId: p.playerId,
                playerName: p.playerName,
                aces: p.points.serve,
                serveErrors: p.errors.serve,
                servesExecuted: p.serves,
                efficiency: p.serves > 0 ? ((p.points.serve - p.errors.serve) / p.serves) * 100 : 0
            }))
        } catch (error) {
            console.error('Error fetching serve efficiency:', error)
            return []
        }
    },

    /**
     * Recalculate and save stats for a specific match based on its actions (events)
     * This fills the match_player_set_stats table
     */
    async recalculateMatchStats(matchId: string, providedActions?: any[]): Promise<void> {
        try {
            console.log(`[Stats] Recalculating stats for match ${matchId}...`)

            let events = providedActions

            // 1. Fetch match metadata ALWAYS
            const { data: match, error } = await supabase
                .from('matches')
                .select('id, team_id, season_id, actions, home_away')
                .eq('id', matchId)
                .single()

            if (error || !match) {
                console.error('Error fetching match for stats calculation:', error)
                return
            }

            const teamId = match.team_id
            const seasonId = match.season_id

            if (!events) {
                if (!match.actions || !Array.isArray(match.actions) || match.actions.length === 0) {
                    console.warn('[Stats] No actions found for match, skipping calculation.')
                    return
                }
                events = match.actions as any[]
            }

            // 2. Initialize stats container: PlayerID -> SetNumber -> Stats
            // Also Initialize Set Score Tracking
            const setScores = new Map<number, { us: number, opponent: number }>()

            type PlayerSetStats = {
                // Points
                kills: number
                aces: number
                blocks: number

                // Errors
                attack_errors: number
                serve_errors: number
                block_errors: number
                reception_errors: number

                // Volumes
                attempts: number
                serves: number
                receptions: number

                // Other
                sets_played: number
            }

            const statsMap = new Map<string, Map<number, PlayerSetStats>>()

            const getStats = (playerId: string, setNum: number): PlayerSetStats => {
                if (!statsMap.has(playerId)) {
                    statsMap.set(playerId, new Map())
                }
                const playerSets = statsMap.get(playerId)!
                if (!playerSets.has(setNum)) {
                    playerSets.set(setNum, {
                        kills: 0, aces: 0, blocks: 0,
                        attack_errors: 0, serve_errors: 0, block_errors: 0, reception_errors: 0,
                        attempts: 0, serves: 0, receptions: 0,
                        sets_played: 1
                    })
                }
                return playerSets.get(setNum)!
            }

            // 3. Process Events
            events.forEach(event => {
                const type = event.type
                const payload = event.payload || {}
                const setNum = payload.setNumber || 1

                // Track Scores
                if (!setScores.has(setNum)) {
                    setScores.set(setNum, { us: 0, opponent: 0 })
                }
                const scores = setScores.get(setNum)!

                if (type === 'POINT_US') {
                    scores.us++
                } else if (type === 'POINT_OPPONENT') {
                    scores.opponent++
                }

                const playerId = payload.playerId

                // Skip events without player attribution
                if (!playerId && type !== 'RECEPTION_EVAL') return

                // Resolve playerId for Reception
                const targetPlayerId = playerId || payload.reception?.playerId
                if (!targetPlayerId) return

                const stats = getStats(targetPlayerId, setNum)

                if (type === 'POINT_US') {
                    const reason = payload.reason
                    if (reason === 'attack_point') stats.kills++
                    else if (reason === 'serve_point') stats.aces++
                    else if (reason === 'block_point') stats.blocks++
                }
                else if (type === 'POINT_OPPONENT') {
                    const reason = payload.reason
                    if (reason === 'attack_error') stats.attack_errors++
                    else if (reason === 'service_error') stats.serve_errors++
                    else if (reason === 'block_error') stats.block_errors++
                    else if (reason === 'reception_error') stats.reception_errors++
                }
                else if (type === 'RECEPTION_EVAL') {
                    stats.receptions++
                    const value = payload.reception?.value
                    if (value === 0) stats.reception_errors++
                }
            })

            // 4. Prepare DB Operations
            // First, DELETE existing stats for this match
            const { error: deleteError } = await supabase
                .from('match_player_set_stats')
                .delete()
                .eq('match_id', matchId)

            if (deleteError) {
                console.error('Error clearing old stats:', deleteError)
            }

            const rowsToInsert: any[] = []

            statsMap.forEach((playerSets, playerId) => {
                playerSets.forEach((stats, setNum) => {
                    rowsToInsert.push({
                        match_id: matchId,
                        team_id: teamId,
                        season_id: seasonId,
                        player_id: playerId,
                        set_number: setNum,

                        // Map fields
                        kills: stats.kills,
                        attack_errors: stats.attack_errors,
                        attacks: stats.kills + stats.attack_errors,

                        aces: stats.aces,
                        serve_errors: stats.serve_errors,
                        serves: stats.aces + stats.serve_errors,

                        blocks: stats.blocks,
                        block_errors: stats.block_errors,

                        reception_errors: stats.reception_errors,
                        receptions: stats.receptions,

                        // Derived/Other
                        digs: 0,
                        digs_errors: 0,
                        sets: 0,
                        set_errors: 0
                    })
                })
            })

            if (rowsToInsert.length > 0) {
                const { error: insertError } = await supabase
                    .from('match_player_set_stats')
                    .insert(rowsToInsert)

                if (insertError) {
                    console.error('Error inserting new match stats:', insertError)
                    throw insertError
                }
                console.log(`[Stats] Recalculated ${rowsToInsert.length} stats entries for match ${matchId}.`)
            } else {
                console.log('[Stats] No player stats generated from actions.')
            }

        } catch (error) {
            console.error('Error in recalculateMatchStats:', error)
        }
    },

    /**
     * Get stats aggregated by position
     */
    async getPositionAggregation(teamId: string, seasonId: string, lastMatchesCount?: number): Promise<PositionStats[]> {
        try {
            const playerStats = await this.getTeamPlayerStats(teamId, seasonId, lastMatchesCount)

            // Group by position
            const positionMap = new Map<string, {
                points: number
                errors: number
                volume: number
            }>()

            playerStats.forEach(p => {
                const position = p.position || 'Sin posición'
                if (!positionMap.has(position)) {
                    positionMap.set(position, { points: 0, errors: 0, volume: 0 })
                }
                const posStats = positionMap.get(position)!
                posStats.points += p.points.total
                posStats.errors += p.errors.total
                posStats.volume += p.volume.total
            })

            // Calculate team total points
            const teamTotalPoints = playerStats.reduce((sum, p) => sum + p.points.total, 0)

            // Convert to array with calculated fields
            return Array.from(positionMap.entries()).map(([position, stats]) => ({
                position,
                points: stats.points,
                errors: stats.errors,
                ratio: stats.errors > 0 ? stats.points / stats.errors : stats.points,
                volume: stats.volume,
                percentageOfTeamPoints: teamTotalPoints > 0 ? (stats.points / teamTotalPoints) * 100 : 0
            })).sort((a, b) => b.percentageOfTeamPoints - a.percentageOfTeamPoints)
        } catch (error) {
            console.error('Error fetching position aggregation:', error)
            return []
        }
    }
}
