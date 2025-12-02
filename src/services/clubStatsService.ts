import { supabase } from '@/lib/supabaseClient'
import { CategoryStage } from '@/utils/categoryStage'

export interface CategorySummary {
    id: string
    name: CategoryStage
    attendance: number | null
    winLossRatio: number | null
    riskLevel: 'low' | 'medium' | 'high' | null
    teamsCount: number
}

export interface CoachSummary {
    id: string
    name: string
    teamsCount: number
    reportsCompletion: number | null
}

export interface ClubAlert {
    id: string
    message: string
    level: 'info' | 'warning' | 'danger'
    targetType?: 'category' | 'team' | 'coach'
    targetId?: string
}

export interface ClubOverviewSummary {
    // KPIs generales de club
    attendanceGlobal: number | null
    winLossRatio: number | null
    totalTrainings: number
    completedReports: number
    totalReportsExpected: number

    // Resumen por categoría
    categories: CategorySummary[]

    // Resumen por entrenador
    coaches: CoachSummary[]

    // Alertas globales de club
    alerts: ClubAlert[]
}

export const clubStatsService = {
    /**
     * Get comprehensive club overview summary
     */
    async getOverview(clubId: string, seasonId?: string): Promise<ClubOverviewSummary> {
        const [globalKPIs, categories, coaches, alerts] = await Promise.all([
            this.getGlobalKPIs(clubId, seasonId),
            this.getCategoriesSummary(clubId, seasonId),
            this.getCoachesSummary(clubId, seasonId),
            this.getClubAlerts(clubId, seasonId)
        ])

        return {
            ...globalKPIs,
            categories,
            coaches,
            alerts
        }
    },

    /**
     * Calculate global KPIs for the club
     */
    async getGlobalKPIs(clubId: string, seasonId?: string): Promise<{
        attendanceGlobal: number | null
        winLossRatio: number | null
        totalTrainings: number
        completedReports: number
        totalReportsExpected: number
    }> {
        try {
            // Get all teams for the club
            let teamsQuery = supabase
                .from('teams')
                .select('id')
                .eq('club_id', clubId)

            if (seasonId) {
                teamsQuery = teamsQuery.eq('season_id', seasonId)
            }

            const { data: teams, error: teamsError } = await teamsQuery

            if (teamsError || !teams || teams.length === 0) {
                return {
                    attendanceGlobal: null,
                    winLossRatio: null,
                    totalTrainings: 0,
                    completedReports: 0,
                    totalReportsExpected: 0
                }
            }

            const teamIds = teams.map(t => t.id)

            // Calculate matches win/loss ratio
            const { data: matches } = await supabase
                .from('matches')
                .select('result, status')
                .in('team_id', teamIds)
                .eq('status', 'finished')

            let wins = 0
            let losses = 0

            if (matches) {
                matches.forEach(match => {
                    if (match.result) {
                        // Parse result like "3-0", "3-1", etc.
                        const parts = match.result.split('-')
                        if (parts.length === 2) {
                            const ourSets = parseInt(parts[0])
                            const theirSets = parseInt(parts[1])
                            if (!isNaN(ourSets) && !isNaN(theirSets)) {
                                if (ourSets > theirSets) wins++
                                else if (theirSets > ourSets) losses++
                            }
                        }
                    }
                })
            }

            const winLossRatio = losses > 0 ? parseFloat((wins / losses).toFixed(2)) : wins > 0 ? wins : null

            // Count trainings (when training system is implemented)
            // For now, return 0
            const totalTrainings = 0

            // Count evaluations
            const { data: evaluations } = await supabase
                .from('player_team_season_evaluations')
                .select('id, overall_rating')
                .in('team_id', teamIds)

            const totalReportsExpected = teams.length * 2 // Assuming 2 evaluations per team (initial + mid/final)
            const completedReports = evaluations?.filter(e => e.overall_rating !== null).length || 0

            // Attendance calculation (placeholder for now)
            const attendanceGlobal = null

            return {
                attendanceGlobal,
                winLossRatio,
                totalTrainings,
                completedReports,
                totalReportsExpected
            }
        } catch (error) {
            console.error('Error calculating global KPIs:', error)
            return {
                attendanceGlobal: null,
                winLossRatio: null,
                totalTrainings: 0,
                completedReports: 0,
                totalReportsExpected: 0
            }
        }
    },

    /**
     * Get summary by category
     */
    async getCategoriesSummary(clubId: string, seasonId?: string): Promise<CategorySummary[]> {
        try {
            // Get all teams with their category
            let teamsQuery = supabase
                .from('teams')
                .select('id, category_stage')
                .eq('club_id', clubId)

            if (seasonId) {
                teamsQuery = teamsQuery.eq('season_id', seasonId)
            }

            const { data: teams, error: teamsError } = await teamsQuery

            if (teamsError || !teams) {
                return []
            }

            // Group teams by category
            const categoriesMap = new Map<CategoryStage, string[]>()
            teams.forEach(team => {
                if (team.category_stage) {
                    const existing = categoriesMap.get(team.category_stage) || []
                    existing.push(team.id)
                    categoriesMap.set(team.category_stage, existing)
                }
            })

            // Calculate stats for each category
            const categoriesSummary: CategorySummary[] = []

            for (const [categoryName, teamIds] of categoriesMap.entries()) {
                // Get matches for this category
                const { data: matches } = await supabase
                    .from('matches')
                    .select('result, status')
                    .in('team_id', teamIds)
                    .eq('status', 'finished')

                let wins = 0
                let losses = 0

                if (matches) {
                    matches.forEach(match => {
                        if (match.result) {
                            const parts = match.result.split('-')
                            if (parts.length === 2) {
                                const ourSets = parseInt(parts[0])
                                const theirSets = parseInt(parts[1])
                                if (!isNaN(ourSets) && !isNaN(theirSets)) {
                                    if (ourSets > theirSets) wins++
                                    else if (theirSets > ourSets) losses++
                                }
                            }
                        }
                    })
                }

                const winLossRatio = losses > 0 ? parseFloat((wins / losses).toFixed(2)) : wins > 0 ? wins : null

                // Determine risk level based on win/loss ratio
                let riskLevel: 'low' | 'medium' | 'high' | null = null
                if (winLossRatio !== null) {
                    if (winLossRatio >= 1.5) riskLevel = 'low'
                    else if (winLossRatio >= 0.8) riskLevel = 'medium'
                    else riskLevel = 'high'
                }

                categoriesSummary.push({
                    id: categoryName,
                    name: categoryName,
                    attendance: null, // TODO: Implement when attendance tracking is available
                    winLossRatio,
                    riskLevel,
                    teamsCount: teamIds.length
                })
            }

            // Sort by category order (Benjamín -> Sénior)
            const categoryOrder: CategoryStage[] = ['Benjamín', 'Alevín', 'Infantil', 'Cadete', 'Juvenil', 'Júnior', 'Sénior']
            categoriesSummary.sort((a, b) => {
                return categoryOrder.indexOf(a.name) - categoryOrder.indexOf(b.name)
            })

            return categoriesSummary
        } catch (error) {
            console.error('Error getting categories summary:', error)
            return []
        }
    },

    /**
     * Get summary by coach
     */
    async getCoachesSummary(clubId: string, seasonId?: string): Promise<CoachSummary[]> {
        try {
            // Get all coaches (users with role 'coach' or 'dt' in this club)
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, role')
                .eq('club_id', clubId)
                .in('role', ['coach', 'dt'])

            if (profilesError || !profiles) {
                return []
            }

            const coachesSummary: CoachSummary[] = []

            for (const profile of profiles) {
                // Get teams assigned to this coach
                const { data: assignments } = await supabase
                    .from('coach_team_assignments')
                    .select('team_id')
                    .eq('coach_id', profile.id)

                const teamsCount = assignments?.length || 0

                // Get evaluations completion rate
                let reportsCompletion: number | null = null
                if (assignments && assignments.length > 0) {
                    const teamIds = assignments.map(a => a.team_id)

                    const { data: evaluations } = await supabase
                        .from('player_team_season_evaluations')
                        .select('id, overall_rating')
                        .in('team_id', teamIds)

                    if (evaluations) {
                        const totalExpected = teamsCount * 2 // 2 evaluations per team
                        const completed = evaluations.filter(e => e.overall_rating !== null).length
                        reportsCompletion = totalExpected > 0 ? Math.round((completed / totalExpected) * 100) : 0
                    }
                }

                coachesSummary.push({
                    id: profile.id,
                    name: profile.full_name || 'Sin nombre',
                    teamsCount,
                    reportsCompletion
                })
            }

            // Sort by teams count (descending)
            coachesSummary.sort((a, b) => b.teamsCount - a.teamsCount)

            return coachesSummary
        } catch (error) {
            console.error('Error getting coaches summary:', error)
            return []
        }
    },

    /**
     * Get club-wide alerts
     */
    async getClubAlerts(clubId: string, seasonId?: string): Promise<ClubAlert[]> {
        const alerts: ClubAlert[] = []

        try {
            // Get all teams
            let teamsQuery = supabase
                .from('teams')
                .select('id, name, category_stage')
                .eq('club_id', clubId)

            if (seasonId) {
                teamsQuery = teamsQuery.eq('season_id', seasonId)
            }

            const { data: teams } = await teamsQuery

            if (!teams || teams.length === 0) {
                return alerts
            }

            const teamIds = teams.map(t => t.id)

            // Check for pending evaluations across all teams
            const currentMonth = new Date().getMonth()
            const isMidSeason = currentMonth >= 2 && currentMonth <= 4 // March to May
            const isEndSeason = currentMonth >= 5 && currentMonth <= 6 // June to July

            if (isMidSeason || isEndSeason) {
                const { data: evaluations } = await supabase
                    .from('player_team_season_evaluations')
                    .select('id, phase, team_id')
                    .in('team_id', teamIds)

                const phase = isMidSeason ? 'mid' : 'final'
                const teamsWithEval = new Set(
                    evaluations?.filter(e => e.phase === phase).map(e => e.team_id) || []
                )

                const teamsMissingEval = teams.filter(t => !teamsWithEval.has(t.id))

                if (teamsMissingEval.length > 0) {
                    alerts.push({
                        id: `${phase}-eval-pending`,
                        message: `${teamsMissingEval.length} equipo(s) con evaluaciones ${phase === 'mid' ? 'de mitad de temporada' : 'finales'} pendientes`,
                        level: 'warning'
                    })
                }
            }

            // Check for upcoming matches in the next 7 days
            const { data: upcomingMatches } = await supabase
                .from('matches')
                .select('id, match_date, opponent_name, team_id')
                .in('team_id', teamIds)
                .eq('status', 'planned')
                .gte('match_date', new Date().toISOString())
                .lte('match_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
                .order('match_date', { ascending: true })

            if (upcomingMatches && upcomingMatches.length > 0) {
                alerts.push({
                    id: 'upcoming-matches',
                    message: `${upcomingMatches.length} partido(s) programado(s) en los próximos 7 días`,
                    level: 'info'
                })
            }

            // Check for teams with poor performance (win/loss ratio < 0.5)
            const { data: allMatches } = await supabase
                .from('matches')
                .select('team_id, result, status')
                .in('team_id', teamIds)
                .eq('status', 'finished')

            if (allMatches) {
                const teamPerformance = new Map<string, { wins: number, losses: number }>()

                allMatches.forEach(match => {
                    if (match.result) {
                        const parts = match.result.split('-')
                        if (parts.length === 2) {
                            const ourSets = parseInt(parts[0])
                            const theirSets = parseInt(parts[1])
                            if (!isNaN(ourSets) && !isNaN(theirSets)) {
                                const perf = teamPerformance.get(match.team_id) || { wins: 0, losses: 0 }
                                if (ourSets > theirSets) perf.wins++
                                else if (theirSets > ourSets) perf.losses++
                                teamPerformance.set(match.team_id, perf)
                            }
                        }
                    }
                })

                const poorPerformingTeams = teams.filter(team => {
                    const perf = teamPerformance.get(team.id)
                    if (!perf || perf.losses === 0) return false
                    const ratio = perf.wins / perf.losses
                    return ratio < 0.5 && (perf.wins + perf.losses) >= 3 // At least 3 matches played
                })

                if (poorPerformingTeams.length > 0) {
                    alerts.push({
                        id: 'poor-performance',
                        message: `${poorPerformingTeams.length} equipo(s) con rendimiento bajo (ratio V/D < 0.5)`,
                        level: 'danger'
                    })
                }
            }

        } catch (error) {
            console.error('Error getting club alerts:', error)
        }

        return alerts
    }
}
