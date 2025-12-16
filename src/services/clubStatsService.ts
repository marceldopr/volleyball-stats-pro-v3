import { supabase } from '@/lib/supabaseClient'
import { CategoryStage } from '@/utils/categoryStage'


export interface TeamCategoryDetail {
    id: string
    name: string
    shortName: string
    attendance: number | null
    rosterSize: number
    injuryCount: number
    lastActivityDays: number | null
    globalStatus: 'high' | 'medium' | 'low' // Red/Orange/Green indicator
    unregisteredTrainingsCount: number
    inactivityDays: number
}

export interface CategorySummary {
    id: string
    name: CategoryStage
    attendance: number | null
    winLossRatio: number | null
    wins: number
    losses: number
    riskLevel: 'low' | 'medium' | 'high' | null
    teamsCount: number
    teams: TeamCategoryDetail[]
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
    // KPIs Dashboard Club (4 Ejes)
    attendanceGlobal: number | null

    // Entrenamientos no registrados (ventana 7 días)
    unregisteredTrainingsCount: number

    // Desequilibrio de equipos (solo equipos en ROJO < 9 jugadores)
    imbalancedTeamsCount: number

    // Equipos inactivos (sin confirmar asistencia en 7 días)
    inactiveTeamsCount: number

    // Contexto adicional para tarjetas
    totalTeams: number
    activeTeamsCount: number // Equipos al día con actividad

    // Resumen por categoría
    categories: CategorySummary[]

    // Resumen por entrenador (solo problemáticos se usarán en UI, pero devolvemos todos con flag)
    coaches: CoachSummary[]

    // Alertas (solo de los 4 ejes)
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
     * V2-ONLY
     */
    /**
     * Calculate global KPIs for the club (Refactored for 4-Axes)
     */
    async getGlobalKPIs(clubId: string, seasonId?: string): Promise<{
        attendanceGlobal: number | null
        unregisteredTrainingsCount: number
        imbalancedTeamsCount: number
        inactiveTeamsCount: number
        totalTeams: number
        activeTeamsCount: number
    }> {
        try {
            // 1. Get teams
            let teamsQuery = supabase
                .from('teams')
                .select('id')
                .eq('club_id', clubId)

            if (seasonId) teamsQuery = teamsQuery.eq('season_id', seasonId)

            const { data: teams, error: teamsError } = await teamsQuery

            if (teamsError || !teams || teams.length === 0) {
                return {
                    attendanceGlobal: null,
                    unregisteredTrainingsCount: 0,
                    imbalancedTeamsCount: 0,
                    inactiveTeamsCount: 0,
                    totalTeams: 0,
                    activeTeamsCount: 0
                }
            }

            const teamIds = teams.map(t => t.id)
            const totalTeams = teams.length

            // 2. Attendance Global (30 days)
            let attendanceGlobal = null
            const startDate30 = new Date()
            startDate30.setDate(startDate30.getDate() - 30)

            // Get trainings in last 30 days
            const { data: trainingsLast30 } = await supabase
                .from('trainings')
                .select('id')
                .in('team_id', teamIds)
                .gte('date', startDate30.toISOString())
                .lte('date', new Date().toISOString())

            if (trainingsLast30 && trainingsLast30.length > 0) {
                const tIds = trainingsLast30.map(t => t.id)
                const { data: attendance } = await supabase
                    .from('training_attendance')
                    .select('status')
                    .in('training_id', tIds)

                if (attendance && attendance.length > 0) {
                    const valid = attendance.filter(r => r.status === 'present' || r.status === 'justified').length
                    attendanceGlobal = Math.round((valid / attendance.length) * 100)
                }
            }

            // 3. Unregistered Trainings (Last 7 days, end_time < now)
            // Note: We need trainings that happened but have NO attendance records
            const startDate7 = new Date()
            startDate7.setDate(startDate7.getDate() - 7)
            const now = new Date()

            const { data: trainingsLast7 } = await supabase
                .from('trainings')
                .select('id, team_id, date, end_time') // Assuming end_time exists or we infer from date
                .in('team_id', teamIds)
                .gte('date', startDate7.toISOString())
                .lte('date', now.toISOString())

            let unregisteredTrainingsCount = 0

            if (trainingsLast7 && trainingsLast7.length > 0) {
                // Check which ones have attendance
                const trainingIds7 = trainingsLast7.map(t => t.id)
                const { data: attExists } = await supabase
                    .from('training_attendance')
                    .select('training_id')
                    .in('training_id', trainingIds7)

                const trainingsWithAttendance = new Set(attExists?.map(a => a.training_id))

                // Filter: Past trainings (already ended) without attendance
                // Simplified: If date < now (ignoring time for now to include today's earlier trainings)
                trainingsLast7.forEach(t => {
                    const tDate = new Date(t.date)
                    if (tDate < now && !trainingsWithAttendance.has(t.id)) {
                        unregisteredTrainingsCount++
                    }
                })
            }

            // 4. Imbalanced Teams (< 9 players) - RED ONLY
            // We need player count per team.
            // Assuming table 'players' has 'team_id'
            const { data: players } = await supabase
                .from('players')
                .select('team_id')
                .in('team_id', teamIds)

            const teamPlayerCounts = new Map<string, number>()
            players?.forEach(p => {
                if (p.team_id) {
                    teamPlayerCounts.set(p.team_id, (teamPlayerCounts.get(p.team_id) || 0) + 1)
                }
            })

            let imbalancedTeamsCount = 0 // < 9 players
            teamIds.forEach(id => {
                const count = teamPlayerCounts.get(id) || 0
                if (count < 9) {
                    imbalancedTeamsCount++
                }
            })

            // 5. Inactive Teams (No activity in last 7 days)
            // Activity = Confirming attendance.
            // We check the DATE of the latest training with attendance for each team.
            // If latest training with attendance is > 7 days ago, team is inactive.

            // Get latest training with attendance for each team
            // We can fetch all trainings with attendance and group by team
            const { data: allTrainingsWithAttendance } = await supabase
                .from('trainings')
                .select('team_id, date, training_attendance!inner(id)') // Inner join ensures attendance exists
                .in('team_id', teamIds)
                .order('date', { ascending: false })

            const teamLatestActivity = new Map<string, Date>()

            allTrainingsWithAttendance?.forEach(t => {
                const d = new Date(t.date)
                if (!teamLatestActivity.has(t.team_id)) {
                    teamLatestActivity.set(t.team_id, d)
                } else {
                    const current = teamLatestActivity.get(t.team_id)!
                    if (d > current) teamLatestActivity.set(t.team_id, d)
                }
            })

            let inactiveTeamsCount = 0
            const activityThresholdDate = new Date()
            activityThresholdDate.setDate(activityThresholdDate.getDate() - 7)

            teamIds.forEach(id => {
                const lastActivity = teamLatestActivity.get(id)
                if (!lastActivity || lastActivity < activityThresholdDate) {
                    inactiveTeamsCount++
                }
            })

            const activeTeamsCount = totalTeams - inactiveTeamsCount

            return {
                attendanceGlobal,
                unregisteredTrainingsCount,
                imbalancedTeamsCount,
                inactiveTeamsCount,
                totalTeams,
                activeTeamsCount
            }

        } catch (error) {
            console.error('Error calculating global KPIs:', error)
            return {
                attendanceGlobal: null,
                unregisteredTrainingsCount: 0,
                imbalancedTeamsCount: 0,
                inactiveTeamsCount: 0,
                totalTeams: 0,
                activeTeamsCount: 0
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
                .select('id, category_stage, custom_name')
                .eq('club_id', clubId)

            if (seasonId) {
                teamsQuery = teamsQuery.eq('season_id', seasonId)
            }

            const { data: teams, error: teamsError } = await teamsQuery

            if (teamsError || !teams) return []

            // Group teams by category to build categoriesMap
            // Only show categories that have teams
            const categoriesMap = new Map<CategoryStage, string[]>()

            teams.forEach(t => {
                if (t.category_stage) {
                    const list = categoriesMap.get(t.category_stage) || []
                    list.push(t.id)
                    categoriesMap.set(t.category_stage, list)
                }
            })

            // 1. Get all player assignments (roster size)
            const { data: teamPlayers } = await supabase
                .from('player_team_season')
                .select('team_id')
                .in('team_id', teams.map(t => t.id))

            const teamRosterSizes = new Map<string, number>()
            teamPlayers?.forEach(p => {
                teamRosterSizes.set(p.team_id, (teamRosterSizes.get(p.team_id) || 0) + 1)
            })

            // Calculate stats for each category
            const categoriesSummary: CategorySummary[] = []

            for (const [categoryName, teamIds] of categoriesMap.entries()) {
                // Get matches for this category
                const { data: matches } = await supabase
                    .from('matches')
                    .select('result, status, home_away, our_sets, opponent_sets')
                    .in('team_id', teamIds)
                    .eq('status', 'finished')

                let wins = 0
                let losses = 0

                matches?.forEach(match => {
                    const sets = getSetsFromMatch(match)
                    if (sets.ourSets !== null && sets.theirSets !== null) {
                        if (sets.ourSets > sets.theirSets) wins++
                        else if (sets.theirSets > sets.ourSets) losses++
                    }
                })

                const winLossRatio = losses > 0 ? parseFloat((wins / losses).toFixed(2)) : wins > 0 ? wins : null

                // Risk logic
                let riskLevel: 'low' | 'medium' | 'high' | null = null
                if (winLossRatio !== null) {
                    if (winLossRatio >= 1.5) riskLevel = 'low'
                    else if (winLossRatio >= 0.8) riskLevel = 'medium'
                    else riskLevel = 'high'
                }

                // Attendance Logic (Category + Per Team)
                const startDate = new Date()
                startDate.setDate(startDate.getDate() - 30)

                const { data: catTrainings } = await supabase
                    .from('trainings')
                    .select('id, team_id')
                    .in('team_id', teamIds)
                    .gte('date', startDate.toISOString())
                    .lte('date', new Date().toISOString())

                let categoryAttendance: number | null = null
                const teamDetailMap = new Map<string, TeamCategoryDetail>()

                // Initialize default details for all teams in category
                teamIds.forEach(tId => {
                    const t = teams.find(x => x.id === tId)
                    // Construct a short display name. If category is "Cadete", we don't need "Cadete" in the team name field if it's "Cadete A".
                    // We just want "A" or "Azul".
                    let shortName = t?.custom_name || 'Equipo'
                    if (t?.custom_name) shortName = t.custom_name
                    // Clean up redundancy if exists
                    const catPrefix = categoryName + ' '
                    if (shortName.startsWith(catPrefix)) {
                        shortName = shortName.replace(catPrefix, '')
                    }

                    teamDetailMap.set(tId, {
                        id: tId,
                        name: t?.custom_name || 'Equipo',
                        shortName: shortName,
                        attendance: null,
                        rosterSize: teamRosterSizes.get(tId) || 0,
                        injuryCount: 0,
                        lastActivityDays: null,
                        globalStatus: 'low', // Will be calculated later
                        unregisteredTrainingsCount: 0,
                        inactivityDays: 0
                    })
                })

                if (catTrainings && catTrainings.length > 0) {
                    const tIds = catTrainings.map(t => t.id)
                    const { data: att } = await supabase
                        .from('training_attendance')
                        .select('training_id, status')
                        .in('training_id', tIds)

                    if (att && att.length > 0) {
                        // Global Category Att
                        const valid = att.filter(r => r.status === 'present' || r.status === 'justified').length
                        categoryAttendance = Math.round((valid / att.length) * 100)

                        // Per Team Att
                        const trainingStats = new Map<string, { total: number, present: number }>()
                        att.forEach(a => {
                            const s = trainingStats.get(a.training_id) || { total: 0, present: 0 }
                            s.total++
                            if (a.status === 'present' || a.status === 'justified') s.present++
                            trainingStats.set(a.training_id, s)
                        })

                        teamIds.forEach(tId => {
                            const teamTrainingsList = catTrainings.filter(t => t.team_id === tId)
                            if (teamTrainingsList.length > 0) {
                                let tTotal = 0
                                let tPresent = 0
                                teamTrainingsList.forEach(tt => {
                                    const s = trainingStats.get(tt.id)
                                    if (s) {
                                        tTotal += s.total
                                        tPresent += s.present
                                    }
                                })
                                if (tTotal > 0) {
                                    const teamAtt = Math.round((tPresent / tTotal) * 100)
                                    const current = teamDetailMap.get(tId)
                                    if (current) current.attendance = teamAtt
                                }
                            }
                        })
                    }
                }

                // Calculate unregistered trainings (last 7 days) per team
                const startDate7 = new Date()
                startDate7.setDate(startDate7.getDate() - 7)
                const { data: recentTrainings } = await supabase
                    .from('trainings')
                    .select('id, team_id, date')
                    .in('team_id', teamIds)
                    .gte('date', startDate7.toISOString())
                    .lte('date', new Date().toISOString())

                if (recentTrainings) {
                    const trainingIds = recentTrainings.map(t => t.id)
                    const { data: attRecords } = await supabase
                        .from('training_attendance')
                        .select('training_id')
                        .in('training_id', trainingIds)

                    const trainingsWithAttendance = new Set(attRecords?.map(a => a.training_id) || [])

                    // Count unregistered trainings per team
                    teamIds.forEach(tId => {
                        const teamTrainings = recentTrainings.filter(t => t.team_id === tId)
                        const unregistered = teamTrainings.filter(t => {
                            const tDate = new Date(t.date)
                            return tDate < new Date() && !trainingsWithAttendance.has(t.id)
                        }).length

                        const teamDetail = teamDetailMap.get(tId)
                        if (teamDetail) teamDetail.unregisteredTrainingsCount = unregistered
                    })
                }

                // Calculate inactivity days per team
                const { data: allTeamTrainings } = await supabase
                    .from('trainings')
                    .select('team_id, date, training_attendance!inner(id)')
                    .in('team_id', teamIds)
                    .order('date', { ascending: false })

                const teamLastActivity = new Map<string, Date>()
                allTeamTrainings?.forEach(t => {
                    if (!teamLastActivity.has(t.team_id)) {
                        teamLastActivity.set(t.team_id, new Date(t.date))
                    }
                })

                const now = new Date()
                teamIds.forEach(tId => {
                    const lastActivity = teamLastActivity.get(tId)
                    const teamDetail = teamDetailMap.get(tId)
                    if (teamDetail) {
                        if (lastActivity) {
                            const daysSince = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
                            teamDetail.inactivityDays = daysSince
                        } else {
                            teamDetail.inactivityDays = 999 // No activity ever
                        }
                    }
                })

                // Calculate global status for each team
                teamIds.forEach(tId => {
                    const team = teamDetailMap.get(tId)
                    if (!team) return

                    let riskFactors = 0

                    // High risk factors (instant red)
                    if (team.attendance !== null && team.attendance < 80) riskFactors += 3
                    if (team.rosterSize < 9) riskFactors += 3
                    if (team.inactivityDays > 7) riskFactors += 3
                    if (team.unregisteredTrainingsCount > 2) riskFactors += 3

                    // Medium risk factors
                    if (team.attendance !== null && team.attendance >= 80 && team.attendance < 85) riskFactors += 1
                    if (team.rosterSize === 9) riskFactors += 1
                    if (team.inactivityDays >= 4 && team.inactivityDays <= 7) riskFactors += 1
                    if (team.unregisteredTrainingsCount >= 1 && team.unregisteredTrainingsCount <= 2) riskFactors += 1

                    // Assign status
                    if (riskFactors >= 3) {
                        team.globalStatus = 'high' // Red
                    } else if (riskFactors >= 1) {
                        team.globalStatus = 'medium' // Orange
                    } else {
                        team.globalStatus = 'low' // Green
                    }
                })

                categoriesSummary.push({
                    id: categoryName,
                    name: categoryName,
                    attendance: categoryAttendance,
                    winLossRatio,
                    wins,
                    losses,
                    riskLevel,
                    teamsCount: teamIds.length,
                    teams: Array.from(teamDetailMap.values()).sort((a, b) => a.name.localeCompare(b.name))
                })
            }

            // Sort outcome
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
            // If seasonId is provided, get teams for that season
            let seasonTeamIds: string[] | null = null
            if (seasonId) {
                const { data: seasonTeams } = await supabase
                    .from('teams')
                    .select('id')
                    .eq('club_id', clubId)
                    .eq('season_id', seasonId)

                seasonTeamIds = seasonTeams?.map(t => t.id) || []

                // If no teams in this season, return empty
                if (seasonTeamIds.length === 0) {
                    return []
                }
            }

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
                // Get teams assigned to this coach (filtered by season if applicable)
                let assignmentsQuery = supabase
                    .from('coach_team_assignments')
                    .select('team_id')
                    .eq('user_id', profile.id)

                // If we have seasonTeamIds, filter only those teams
                if (seasonTeamIds !== null) {
                    assignmentsQuery = assignmentsQuery.in('team_id', seasonTeamIds)
                }

                const { data: assignments } = await assignmentsQuery

                const teamsCount = assignments?.length || 0

                // Get evaluations completion rate
                let reportsCompletion: number | null = null
                if (assignments && assignments.length > 0) {
                    const teamIds = assignments.map(a => a.team_id)

                    const { data: evaluations } = await supabase
                        .from('player_team_season_evaluations')
                        .select('id, team_id, phase')
                        .in('team_id', teamIds)

                    if (evaluations) {
                        const totalExpected = teamsCount * 3 // 3 evaluations per team (start, mid, end)
                        // Count unique team-phase pairs
                        const uniqueReports = new Set(
                            evaluations?.map(e => `${e.team_id}-${e.phase}`) || []
                        )
                        const completed = uniqueReports.size
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
    /**
     * Get club-wide alerts (Refactored for 4-Axes)
     */
    async getClubAlerts(clubId: string, seasonId?: string): Promise<ClubAlert[]> {
        const alerts: ClubAlert[] = []

        try {
            // Get all teams
            let teamsQuery = supabase
                .from('teams')
                .select('id, custom_name, category_stage')
                .eq('club_id', clubId)

            if (seasonId) teamsQuery = teamsQuery.eq('season_id', seasonId)
            const { data: teams } = await teamsQuery
            if (!teams || teams.length === 0) return alerts
            const teamIds = teams.map(t => t.id)

            // 1. AXIS: ATTENDANCE (Global or Team)
            // < 80% is Alert. We verify team by team last 30 days.
            const startDate30 = new Date()
            startDate30.setDate(startDate30.getDate() - 30)

            const { data: trainings30 } = await supabase
                .from('trainings')
                .select('id, team_id')
                .in('team_id', teamIds)
                .gte('date', startDate30.toISOString())

            if (trainings30) {
                // Group trainings by team
                const teamTrainings = new Map<string, string[]>()
                trainings30.forEach(t => {
                    const list = teamTrainings.get(t.team_id) || []
                    list.push(t.id)
                    teamTrainings.set(t.team_id, list)
                })

                // Get all attendance records
                const allTrainingIds = trainings30.map(t => t.id)
                if (allTrainingIds.length > 0) {
                    const { data: attendance } = await supabase
                        .from('training_attendance')
                        .select('training_id, status')
                        .in('training_id', allTrainingIds)

                    if (attendance) {
                        // Map trainingId -> attendance stats
                        const trainingStats = new Map<string, { total: number, present: number }>()
                        attendance.forEach(a => {
                            const s = trainingStats.get(a.training_id) || { total: 0, present: 0 }
                            s.total++
                            if (a.status === 'present' || a.status === 'justified') s.present++
                            trainingStats.set(a.training_id, s)
                        })

                        // Calculate team attendance
                        let teamsLowAttendance = 0
                        teams.forEach(team => {
                            const tIds = teamTrainings.get(team.id) || []
                            let teamTotal = 0
                            let teamPresent = 0
                            tIds.forEach(tid => {
                                const stats = trainingStats.get(tid)
                                if (stats) {
                                    teamTotal += stats.total
                                    teamPresent += stats.present
                                }
                            })

                            if (teamTotal > 0) {
                                const rate = (teamPresent / teamTotal) * 100
                                if (rate < 80) {
                                    teamsLowAttendance++
                                }
                            }
                        })

                        if (teamsLowAttendance > 0) {
                            alerts.push({
                                id: 'low-attendance',
                                message: `${teamsLowAttendance} equipos con asistencia < 80%`,
                                level: 'danger',
                                targetType: 'team'
                            })
                        }
                    }
                }
            }


            // 2. AXIS: ACTIVITY
            // 7 played days without registering activity (confirming attendance).
            const { data: allTrainingsWithAttendance } = await supabase
                .from('trainings')
                .select('team_id, date, training_attendance!inner(id)')
                .in('team_id', teamIds)
                .order('date', { ascending: false })

            const teamLatestActivity = new Map<string, Date>()
            allTrainingsWithAttendance?.forEach(t => {
                const d = new Date(t.date)
                if (!teamLatestActivity.has(t.team_id)) {
                    teamLatestActivity.set(t.team_id, d)
                }
            })

            const activityThresholdDate = new Date()
            activityThresholdDate.setDate(activityThresholdDate.getDate() - 7)
            let inactiveTeams = 0

            teams.forEach(t => {
                const last = teamLatestActivity.get(t.id)
                if (!last || last < activityThresholdDate) {
                    inactiveTeams++
                }
            })

            if (inactiveTeams > 0) {
                alerts.push({
                    id: 'inactive-teams',
                    message: `${inactiveTeams} equipos sin registrar actividad reciente`,
                    level: 'warning',
                    targetType: 'team'
                })
            }


            // 3. AXIS: UNREGISTERED TRAININGS
            // Past trainings (last 7 days) without attendance
            const startDate7 = new Date()
            startDate7.setDate(startDate7.getDate() - 7)
            const now = new Date()

            const { data: trainingsLast7 } = await supabase
                .from('trainings')
                .select('id, team_id, date')
                .in('team_id', teamIds)
                .gte('date', startDate7.toISOString())
                .lte('date', now.toISOString())

            if (trainingsLast7) {
                const tIds7 = trainingsLast7.map(t => t.id)
                const { data: attExists } = await supabase
                    .from('training_attendance')
                    .select('training_id')
                    .in('training_id', tIds7)

                const trainingsWithAttendance = new Set(attExists?.map(a => a.training_id))

                let unregisteredCount = 0
                trainingsLast7.forEach(t => {
                    const d = new Date(t.date)
                    if (d < now && !trainingsWithAttendance.has(t.id)) {
                        unregisteredCount++
                    }
                })

                if (unregisteredCount > 0) {
                    alerts.push({
                        id: 'unregistered-trainings',
                        message: `${unregisteredCount} entrenamientos sin asistencia registrada esta semana`,
                        level: unregisteredCount > 2 ? 'danger' : 'warning',
                        targetType: 'team'
                    })
                }
            }


            // 4. AXIS: TEAM BALANCE
            // Teams with < 9 players (RED)
            const { data: players } = await supabase
                .from('players')
                .select('team_id')
                .in('team_id', teamIds)

            const teamPlayerCounts = new Map<string, number>()
            players?.forEach(p => {
                if (p.team_id) {
                    teamPlayerCounts.set(p.team_id, (teamPlayerCounts.get(p.team_id) || 0) + 1)
                }
            })

            let unbalancedTeams = 0
            teamIds.forEach(id => {
                const count = teamPlayerCounts.get(id) || 0
                if (count < 9) {
                    unbalancedTeams++
                }
            })

            if (unbalancedTeams > 0) {
                alerts.push({
                    id: 'unbalanced-teams',
                    message: `${unbalancedTeams} equipos con plantilla insuficiente (<9 jugadoras)`,
                    level: 'danger',
                    targetType: 'team'
                })
            }

        } catch (error) {
            console.error('Error getting club alerts:', error)
        }

        return alerts
    }
}

/**
 * Helper function: Extreu els sets d'un partit amb lògica de fallback robusta
 * Prioritza our_sets/opponent_sets, i fa fallback a result (string) amb validació
 * V2: Handles "Sets: X-Y (...)" format and considers home_away field
 * IMPORTANT: result is ALWAYS stored as "home-away" format
 */
function getSetsFromMatch(match: any): { ourSets: number | null; theirSets: number | null } {
    // 1. Prioritat: utilitzar columnes numèriques
    if (match.our_sets !== null && match.opponent_sets !== null) {
        return {
            ourSets: match.our_sets,
            theirSets: match.opponent_sets
        }
    }

    // 2. Fallback: parsejar result (string) amb validació robusta
    if (!match.result) {
        return { ourSets: null, theirSets: null }
    }

    // V2: Clean result from "Sets: X-Y (...)" format
    let cleanResult = match.result
        .replace(/^Sets:\s*/i, '')  // Remove "Sets:" prefix
        .split('(')[0]              // Take only part before parentheses
        .trim()

    if (!cleanResult.includes('-')) {
        return { ourSets: null, theirSets: null }
    }

    const parts = cleanResult.split('-')

    if (parts.length !== 2) {
        return { ourSets: null, theirSets: null }
    }

    const homeSets = Number(parts[0])
    const awaySets = Number(parts[1])

    if (Number.isNaN(homeSets) || Number.isNaN(awaySets)) {
        return { ourSets: null, theirSets: null }
    }

    // CRITICAL: Result is ALWAYS in home-away format
    // If we are 'away', our sets = second number
    // Otherwise (home or undefined), our sets = first number
    if (match.home_away === 'away') {
        return { ourSets: awaySets, theirSets: homeSets }
    } else {
        return { ourSets: homeSets, theirSets: awaySets }
    }
}
