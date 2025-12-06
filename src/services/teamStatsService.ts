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
            pointsErrorRatio: await this.getPointsErrorsRatio(teamId),
            nextEvent,
            alerts
        }
    },

    /**
     * Calculate points/errors ratio for the team based on recent matches
     * Now uses server-side calculation via Postgres function
     */
    async getPointsErrorsRatio(teamId: string, limit: number = 5): Promise<number | null> {
        try {
            const { data, error } = await supabase.rpc('get_points_errors_ratio', {
                p_team_id: teamId,
                p_limit: limit,
            })

            if (error) {
                console.error('Error from get_points_errors_ratio RPC:', error)
                return null
            }

            if (!data || data.length === 0) {
                return null
            }

            const { total_points, total_errors } = data[0]

            // If no points and no errors, return null
            if (!total_points && !total_errors) {
                return null
            }

            // If no errors but there are points, return total points
            if (total_errors === 0) {
                return total_points > 0 ? total_points : null
            }

            // Calculate and return ratio
            return parseFloat((total_points / total_errors).toFixed(2))

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
     */
    async getLastMatchSummary(teamId: string): Promise<string | null> {
        try {
            const { data, error } = await supabase
                .from('matches')
                .select('match_date, opponent_name, result, home_away, actions')
                .eq('team_id', teamId)
                .eq('status', 'finished')
                .order('match_date', { ascending: false })
                .limit(1)
                .single()

            if (error || !data) return null

            let resultText = data.result || 'Sin resultado'

            // Calculate actual result from actions if available (source of truth)
            if (data.actions && Array.isArray(data.actions)) {
                const setCompletedEvents = data.actions.filter((a: any) => a.tipo === 'set_completed')

                if (setCompletedEvents.length > 0) {
                    let setsWonHome = 0
                    let setsWonAway = 0

                    setCompletedEvents.forEach((event: any) => {
                        if (event.homeScore > event.awayScore) {
                            setsWonHome++
                        } else if (event.awayScore > event.homeScore) {
                            setsWonAway++
                        }
                    })

                    resultText = `${setsWonHome}-${setsWonAway}`
                }
            }

            let outcome = ''

            // Parse result to determine win/loss and correct score order
            if (resultText && resultText !== 'Sin resultado') {
                // Try to handle "3-1 (25-20...)" format by taking just the set score part
                const simpleResult = resultText.split(' ')[0]
                const parts = simpleResult.split('-')

                if (parts.length >= 2) {
                    const homeSets = parseInt(parts[0])
                    const awaySets = parseInt(parts[1])

                    if (!isNaN(homeSets) && !isNaN(awaySets)) {
                        let mySets = 0
                        let oppSets = 0

                        if (data.home_away === 'home') {
                            mySets = homeSets
                            oppSets = awaySets
                        } else {
                            mySets = awaySets
                            oppSets = homeSets
                        }

                        if (mySets > oppSets) outcome = 'Victoria'
                        else if (mySets < oppSets) outcome = 'Derrota'
                        else outcome = 'Empate'

                        resultText = `${mySets}-${oppSets}`
                    }
                }
            }

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
            .select('id, result, status, home_away')
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

        // Parse results in LOCAL-VISITOR format
        matches.forEach(match => {
            if (match.result && match.home_away) {
                const parts = match.result.split('-')
                if (parts.length === 2) {
                    const localSets = parseInt(parts[0])
                    const visitorSets = parseInt(parts[1])

                    if (!isNaN(localSets) && !isNaN(visitorSets)) {
                        // Interpret based on home_away field
                        let mySets, oppSets

                        if (match.home_away === 'home') {
                            // My team is local
                            mySets = localSets
                            oppSets = visitorSets
                        } else { // 'away'
                            // My team is visitor
                            mySets = visitorSets
                            oppSets = localSets
                        }

                        // Determine win/loss
                        if (mySets > oppSets) {
                            wins++
                        } else if (mySets < oppSets) {
                            losses++
                        }
                    }
                }
            }
        })

        return { wins, losses }
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
                console.log('[TeamStats] No stats data found')
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

            console.log('[TeamStats] Query results:', {
                matchCount: matches.length,
                matchIds: matchIds,
                statsRecords: statsData.length,
                playersFound: playersData?.length || 0,
                sampleStats: statsData.slice(0, 3)
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
            const { data: allMatches, error } = await supabase
                .from('matches')
                .select('id, match_date, opponent_name, result, players, actions')
                .eq('team_id', teamId)
                .eq('season_id', seasonId)
                .eq('status', 'finished')
                .order('match_date', { ascending: false })

            if (error) throw error
            if (!allMatches) return []

            let matchesToProcess = allMatches
            if (lastMatchesCount) {
                matchesToProcess = allMatches.slice(0, lastMatchesCount)
            }

            // Reverse to chronological order for graph
            matchesToProcess.reverse()

            return matchesToProcess.map(match => {
                const players = match.players as any[] || []

                let totalPoints = 0
                let totalErrors = 0

                // Calculate sets played from result
                let setsPlayed = 3
                if (match.result) {
                    const parts = match.result.split('-')
                    if (parts.length === 2) {
                        setsPlayed = parseInt(parts[0]) + parseInt(parts[1])
                    }
                }

                players.forEach(p => {
                    totalPoints += (p.stats.kills || 0) + (p.stats.aces || 0) + (p.stats.blocks || 0)
                    totalErrors += (p.stats.attackErrors || 0) + (p.stats.serveErrors || 0) + (p.stats.blockErrors || 0) + (p.stats.receptionErrors || 0)
                })

                return {
                    matchId: match.id,
                    date: match.match_date,
                    opponent: match.opponent_name,
                    result: match.result || '?',
                    stats: {
                        pointsPerSet: setsPlayed > 0 ? totalPoints / setsPlayed : 0,
                        errorsPerSet: setsPlayed > 0 ? totalErrors / setsPlayed : 0,
                        pointsErrorRatio: totalErrors > 0 ? totalPoints / totalErrors : totalPoints
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
            setStats?.forEach(stat => {
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
