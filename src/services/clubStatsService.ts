import { supabase } from '@/lib/supabaseClient'
import { CategoryStage } from '@/utils/categoryStage'
import { getTeamDisplayName } from '@/utils/teamDisplay'


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
    /**
     * Get comprehensive club overview summary
     */
    async getOverview(clubId: string, seasonId?: string): Promise<ClubOverviewSummary> {
        try {
            // 1. MASTER LOAD: Fetch ALL required data in parallel
            // This prevents N+1 queries in sub-functions

            // 1.1 Teams
            let teamsQuery = supabase
                .from('teams')
                .select('id, category_stage, custom_name, gender, season_id, identifier_id, identifier:club_identifiers(id, name, type, code, color_hex)')
                .eq('club_id', clubId)

            if (seasonId) teamsQuery = teamsQuery.eq('season_id', seasonId)

            // 1.2 Coaches (Profiles)
            const profilesQuery = supabase
                .from('profiles')
                .select('id, full_name, role')
                .eq('club_id', clubId)
                .in('role', ['coach', 'dt'])

            // 1.3 Coach Assignments
            const assignmentsQuery = supabase
                .from('coach_team_assignments')
                .select('team_id, user_id')

            // Dates for 30d and 7d windows
            const now = new Date()
            const startDate30 = new Date()
            startDate30.setDate(now.getDate() - 30)

            // Excecute initial batch (Teams & Coaches)
            const [teamsResult, profilesResult, assignmentsResult] = await Promise.all([
                teamsQuery,
                profilesQuery,
                assignmentsQuery
            ])

            const teamsRaw = teamsResult.data || []
            const teams = teamsRaw.map((t: any) => {
                if (t.identifier && Array.isArray(t.identifier)) {
                    t.identifier = t.identifier[0] || null
                }
                return t
            })
            const teamIds = teams.map(t => t.id)
            const profiles = profilesResult.data || []
            const assignments = assignmentsResult.data || [] // We will filter these in memory

            // If no teams, return empty summary
            if (teamIds.length === 0) {
                return {
                    attendanceGlobal: null,
                    unregisteredTrainingsCount: 0,
                    imbalancedTeamsCount: 0,
                    inactiveTeamsCount: 0,
                    totalTeams: 0,
                    activeTeamsCount: 0,
                    categories: [],
                    coaches: [],
                    alerts: []
                }
            }

            // 2. SECOND BATCH: Fetch Dependent Data (using teamIds from batch 1)
            const [
                playersResult,
                trainingsResult,
                matchesResult,
                evaluationsResult
            ] = await Promise.all([
                // 2.1 Players (Active)
                supabase
                    .from('player_team_season')
                    .select('id, team_id, status')
                    .in('team_id', teamIds)
                    .eq('status', 'active'),

                // 2.2 Trainings (Last 30d) + Attendance
                supabase
                    .from('trainings')
                    .select('id, team_id, date, training_attendance(id, status)')
                    .in('team_id', teamIds)
                    .gte('date', startDate30.toISOString())
                    .lte('date', now.toISOString())
                    .order('date', { ascending: false }),

                // 2.3 Matches (Finished) - For Win/Loss
                supabase
                    .from('matches')
                    .select('result, status, home_away, our_sets, opponent_sets, team_id')
                    .in('team_id', teamIds)
                    .eq('status', 'finished'),

                // 2.4 Evaluations (for Coach completion rate)
                supabase
                    .from('player_team_season_evaluations')
                    .select('id, team_id, phase')
                    .in('team_id', teamIds)
            ])

            const players = playersResult.data || []
            const trainings = trainingsResult.data || []
            const matches = matchesResult.data || []
            const evaluations = evaluationsResult.data || []

            // 3. IN-MEMORY PROCESSING
            // Pass the raw data to helper functions (now synchronous or simple data processors)

            const globalKPIs = this.calculateGlobalKPIs(teams, players, trainings)
            const categories = this.calculateCategoriesSummary(teams, matches, trainings, players)
            const coachesSummary = this.calculateCoachesSummary(profiles, assignments, teams, evaluations)
            const alerts = this.calculateClubAlerts(teams, players, trainings)

            return {
                ...globalKPIs,
                categories,
                coaches: coachesSummary,
                alerts
            }

        } catch (error) {
            console.error('Error getting club overview:', error)
            throw error
        }
    },

    /**
     * Calculate global KPIs for the club
     * V2-ONLY
     */
    /**
     * Calculate global KPIs for the club (Refactored for 4-Axes)
     */
    /**
     * Calculate global KPIs (Synchronous)
     */
    calculateGlobalKPIs(
        teams: any[],
        players: any[],
        trainings: any[]
    ): {
        attendanceGlobal: number | null
        unregisteredTrainingsCount: number
        imbalancedTeamsCount: number
        inactiveTeamsCount: number
        totalTeams: number
        activeTeamsCount: number
    } {
        const teamIds = teams.map(t => t.id)
        const totalTeams = teams.length
        const now = new Date()
        const startDate7 = new Date()
        startDate7.setDate(now.getDate() - 7)
        const startDate30 = new Date()
        startDate30.setDate(now.getDate() - 30)

        // --- Metric 1: Imbalanced Teams (< 9 players) ---
        const playersByTeam = new Map<string, number>()
        players.forEach(p => {
            const count = playersByTeam.get(p.team_id) || 0
            playersByTeam.set(p.team_id, count + 1)
        })

        let imbalancedTeamsCount = 0
        teamIds.forEach(id => {
            const count = playersByTeam.get(id) || 0
            if (count < 9) imbalancedTeamsCount++
        })

        // --- Metric 2: Global Attendance (Last 30 days) ---
        let totalRecords = 0
        let presentRecords = 0

        trainings.forEach(t => {
            const attendance = t.training_attendance as any[]
            if (attendance && attendance.length > 0) {
                attendance.forEach(record => {
                    totalRecords++
                    if (record.status === 'present' || record.status === 'justified') {
                        presentRecords++
                    }
                })
            }
        })

        const attendanceGlobal = totalRecords > 0
            ? Math.round((presentRecords / totalRecords) * 100)
            : null

        // --- Metric 3: Unregistered Trainings (Last 7 days) ---
        let unregisteredTrainingsCount = 0

        trainings.forEach(t => {
            const tDate = new Date(t.date)
            const attendance = t.training_attendance as any[]

            if (tDate >= startDate7 && tDate <= now) {
                if (!attendance || attendance.length === 0) {
                    unregisteredTrainingsCount++
                }
            }
        })

        // --- Metric 4: Inactive Teams ---
        const teamLatestActivity = new Map<string, Date>()
        trainings.forEach(t => {
            const d = new Date(t.date)
            const current = teamLatestActivity.get(t.team_id)
            if (!current || d > current) {
                teamLatestActivity.set(t.team_id, d)
            }
        })

        let inactiveTeamsCount = 0
        teamIds.forEach(id => {
            const lastActivity = teamLatestActivity.get(id)
            // Considered inactive if no activity at all OR last activity is older than 7 days
            if (!lastActivity || lastActivity < startDate7) {
                inactiveTeamsCount++
            }
        })

        return {
            attendanceGlobal,
            unregisteredTrainingsCount,
            imbalancedTeamsCount,
            inactiveTeamsCount,
            totalTeams,
            activeTeamsCount: totalTeams - inactiveTeamsCount
        }
    },

    /**
     * Get summary by category
     */
    /**
     * Calculate summary by category (Synchronous)
     */
    calculateCategoriesSummary(
        teams: any[],
        matches: any[],
        trainings: any[],
        players: any[]
    ): CategorySummary[] {
        // Group teams by category
        const categoriesMap = new Map<CategoryStage, string[]>()
        teams.forEach(t => {
            if (t.category_stage) {
                const list = categoriesMap.get(t.category_stage) || []
                list.push(t.id)
                categoriesMap.set(t.category_stage, list)
            }
        })

        // Roster Sizes Map
        const teamRosterSizes = new Map<string, number>()
        players.forEach(p => {
            const current = teamRosterSizes.get(p.team_id) || 0
            teamRosterSizes.set(p.team_id, current + 1)
        })

        // Prepare Stats Maps for fast lookup
        // 1. Training Stats by Team
        const teamTrainingStats = new Map<string, { total: number, present: number, unregistered: number, latest: Date | null }>()
        const now = new Date()
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(now.getDate() - 7)

        trainings.forEach(t => {
            const stats = teamTrainingStats.get(t.team_id) || { total: 0, present: 0, unregistered: 0, latest: null }
            const tDate = new Date(t.date)

            // Update latest activity
            if (!stats.latest || tDate > stats.latest) {
                stats.latest = tDate
            }

            // Unregistered (Last 7 days)
            if (tDate >= oneWeekAgo && tDate <= now) {
                if (!t.training_attendance || t.training_attendance.length === 0) {
                    stats.unregistered++
                }
            }

            // Attendance
            const att = t.training_attendance || []
            att.forEach((r: any) => {
                stats.total++
                if (r.status === 'present' || r.status === 'justified') stats.present++
            })

            teamTrainingStats.set(t.team_id, stats)
        })

        // 2. Match Stats by Team (Wins/Losses)
        const teamMatchStats = new Map<string, { wins: number, losses: number }>()
        matches.forEach(m => {
            if (!m.team_id) return
            const stats = teamMatchStats.get(m.team_id) || { wins: 0, losses: 0 }
            const sets = getSetsFromMatch(m)
            if (sets.ourSets !== null && sets.theirSets !== null) {
                if (sets.ourSets > sets.theirSets) stats.wins++
                else if (sets.theirSets > sets.ourSets) stats.losses++
            }
            teamMatchStats.set(m.team_id, stats)
        })

        // Build Summary
        const categoriesSummary: CategorySummary[] = []

        for (const [categoryName, teamIds] of categoriesMap.entries()) {
            // Aggregate Category Stats
            let catWins = 0
            let catLosses = 0
            let catAttTotal = 0
            let catAttPresent = 0

            const teamDetails: TeamCategoryDetail[] = []

            teamIds.forEach(tId => {
                const t = teams.find(x => x.id === tId)
                if (!t) return

                const mStats = teamMatchStats.get(tId)
                if (mStats) {
                    catWins += mStats.wins
                    catLosses += mStats.losses
                }

                const tStats = teamTrainingStats.get(tId)
                let teamAtt: number | null = null
                let unregistered = 0
                let inactivityDays = 999

                if (tStats) {
                    catAttTotal += tStats.total
                    catAttPresent += tStats.present
                    if (tStats.total > 0) {
                        teamAtt = Math.round((tStats.present / tStats.total) * 100)
                    }
                    unregistered = tStats.unregistered
                    if (tStats.latest) {
                        inactivityDays = Math.floor((now.getTime() - tStats.latest.getTime()) / (1000 * 60 * 60 * 24))
                    }
                }

                // Calculate Global Status (Risk)
                const rosterSize = teamRosterSizes.get(tId) || 0
                let riskFactors = 0
                if (teamAtt !== null && teamAtt < 80) riskFactors += 3
                if (rosterSize < 9) riskFactors += 3
                if (inactivityDays > 7) riskFactors += 3
                if (unregistered > 2) riskFactors += 3

                if (teamAtt !== null && teamAtt >= 80 && teamAtt < 85) riskFactors += 1
                if (rosterSize === 9) riskFactors += 1
                if (inactivityDays >= 4 && inactivityDays <= 7) riskFactors += 1
                if (unregistered >= 1 && unregistered <= 2) riskFactors += 1

                let globalStatus: 'high' | 'medium' | 'low' = 'low'
                if (riskFactors >= 3) globalStatus = 'high'
                else if (riskFactors >= 1) globalStatus = 'medium'

                // Display Name Logic
                let shortName = 'Equipo'
                let fullName = getTeamDisplayName(t)
                shortName = fullName
                if (t.category_stage) {
                    const catPrefix = t.category_stage.toLowerCase()
                    const nameLower = fullName.toLowerCase()
                    if (nameLower.startsWith(catPrefix)) {
                        shortName = fullName.substring(t.category_stage.length).trim()
                    }
                }
                if (!shortName || shortName.trim() === '') shortName = fullName

                teamDetails.push({
                    id: tId,
                    name: fullName,
                    shortName,
                    attendance: teamAtt,
                    rosterSize,
                    injuryCount: 0,
                    lastActivityDays: inactivityDays === 999 ? null : inactivityDays,
                    globalStatus,
                    unregisteredTrainingsCount: unregistered,
                    inactivityDays
                })
            })

            // Category Level Metrics
            let categoryAttendance: number | null = null
            if (catAttTotal > 0) {
                categoryAttendance = Math.round((catAttPresent / catAttTotal) * 100)
            }

            const winLossRatio = catLosses > 0 ? parseFloat((catWins / catLosses).toFixed(2)) : catWins > 0 ? catWins : null

            let riskLevel: 'low' | 'medium' | 'high' | null = null
            if (winLossRatio !== null) {
                if (winLossRatio >= 1.5) riskLevel = 'low'
                else if (winLossRatio >= 0.8) riskLevel = 'medium'
                else riskLevel = 'high'
            }

            categoriesSummary.push({
                id: categoryName,
                name: categoryName,
                attendance: categoryAttendance,
                winLossRatio,
                wins: catWins,
                losses: catLosses,
                riskLevel,
                teamsCount: teamIds.length,
                teams: teamDetails.sort((a, b) => a.name.localeCompare(b.name))
            })
        }

        // Sort Categories
        const categoryOrder: CategoryStage[] = ['Benjamín', 'Alevín', 'Infantil', 'Cadete', 'Juvenil', 'Júnior', 'Sénior']
        categoriesSummary.sort((a, b) => {
            return categoryOrder.indexOf(a.name) - categoryOrder.indexOf(b.name)
        })

        return categoriesSummary
    },

    /**
     * Get summary by coach
     */
    /**
     * Calculate summary by coach (Synchronous)
     */
    calculateCoachesSummary(
        profiles: any[],
        assignments: any[],
        teams: any[],
        evaluations: any[]
    ): CoachSummary[] {
        const coachesSummary: CoachSummary[] = []
        // Optional: filter assignments only for teams in the current 'teams' list (if season filtered)
        const teamIdsSet = new Set(teams.map(t => t.id))

        for (const profile of profiles) {
            // Filter assignments for this coach and match with current season teams
            const coachAssignments = assignments.filter(a =>
                a.user_id === profile.id && teamIdsSet.has(a.team_id)
            )

            const teamsCount = coachAssignments.length

            let reportsCompletion: number | null = null
            if (teamsCount > 0) {
                const assignedTeamIds = coachAssignments.map(a => a.team_id)

                // Evaluations for these teams
                const coachEvals = evaluations.filter(e => assignedTeamIds.includes(e.team_id))

                const totalExpected = teamsCount * 3 // 3 reports per team
                const uniqueReports = new Set(
                    coachEvals.map(e => `${e.team_id}-${e.phase}`)
                )
                const completed = uniqueReports.size
                reportsCompletion = totalExpected > 0 ? Math.round((completed / totalExpected) * 100) : 0
            }

            coachesSummary.push({
                id: profile.id,
                name: profile.full_name || 'Sin nombre',
                teamsCount,
                reportsCompletion
            })
        }

        // Sort by team count (descending)
        coachesSummary.sort((a, b) => b.teamsCount - a.teamsCount)

        return coachesSummary
    },

    /**
     * Get club-wide alerts
     */
    /**
     * Get club-wide alerts (Refactored for 4-Axes)
     */
    /**
     * Calculate club-wide alerts (Synchronous)
     */
    calculateClubAlerts(
        teams: any[],
        players: any[], // now using player_team_season
        trainings: any[]
    ): ClubAlert[] {
        const alerts: ClubAlert[] = []
        const teamIds = teams.map(t => t.id)
        const now = new Date()
        const startDate7 = new Date()
        startDate7.setDate(now.getDate() - 7)

        // 1. AXIS: ATTENDANCE (Global or Team)
        // < 80% is Alert
        // Calc attendance per team using training list
        const teamAttendanceMap = new Map<string, { total: number, present: number }>()

        trainings.forEach(t => {
            const att = t.training_attendance || []
            let tTotal = 0
            let tPresent = 0
            att.forEach((r: any) => {
                tTotal++
                if (r.status === 'present' || r.status === 'justified') tPresent++
            })

            const current = teamAttendanceMap.get(t.team_id) || { total: 0, present: 0 }
            current.total += tTotal
            current.present += tPresent
            teamAttendanceMap.set(t.team_id, current)
        })

        let teamsLowAttendance = 0
        teams.forEach(t => {
            const stats = teamAttendanceMap.get(t.id)
            if (stats && stats.total > 0) {
                const rate = (stats.present / stats.total) * 100
                if (rate < 80) teamsLowAttendance++
            }
        })

        if (teamsLowAttendance > 0) {
            alerts.push({
                id: 'low-attendance',
                message: `${teamsLowAttendance} equipos con asistencia < 80 % `,
                level: 'danger',
                targetType: 'team'
            })
        }

        // 2. AXIS: UNREGISTERED TRAININGS
        // Already calculated in getOverview flow indirectly, but let's count for alerts
        let unregisteredCount = 0
        trainings.forEach(t => {
            const tDate = new Date(t.date)
            if (tDate >= startDate7 && tDate <= now) {
                const att = t.training_attendance || []
                if (att.length === 0) unregisteredCount++
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

        // 3. AXIS: ACTIVITY (No activity in 7 days)
        const teamLatestActivity = new Map<string, Date>()
        trainings.forEach(t => {
            const d = new Date(t.date)
            const current = teamLatestActivity.get(t.team_id)
            if (!current || d > current) {
                teamLatestActivity.set(t.team_id, d)
            }
        })

        let inactiveTeams = 0
        teams.forEach(t => {
            const last = teamLatestActivity.get(t.id)
            if (!last || last < startDate7) {
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

        // 4. AXIS: TEAM BALANCE (< 9 players)
        // Count players per team
        const teamPlayerCounts = new Map<string, number>()
        players.forEach(p => {
            const count = teamPlayerCounts.get(p.team_id) || 0
            teamPlayerCounts.set(p.team_id, count + 1)
        })

        let unbalancedTeams = 0
        teams.forEach(t => {
            const count = teamPlayerCounts.get(t.id) || 0
            if (count < 9) unbalancedTeams++
        })

        if (unbalancedTeams > 0) {
            alerts.push({
                id: 'imbalanced-teams',
                message: `${unbalancedTeams} equipos con plantilla insuficiente (< 9 jugadoras)`,
                level: 'danger',
                targetType: 'team'
            })
        }

        return alerts
    },
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
