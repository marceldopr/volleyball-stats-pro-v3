/**
 * Application Routes - Centralized route definitions
 * 
 * Purpose: Prevent hardcoded route strings and avoid reintroducing legacy routes.
 * Usage: Import ROUTES and use ROUTES.LIVE_MATCH.replace(':matchId', id)
 */

export const ROUTES = {
    // Core
    HOME: '/',
    LOGIN: '/login',
    REGISTER: '/register',

    // Teams
    TEAMS: '/teams',
    TEAM_DETAIL: '/teams/:teamId',
    TEAM_CONTEXT: '/teams/:teamId/context',
    TEAM_SEASON_SUMMARY: '/teams/:teamId/season/:seasonId/summary',

    // Matches (V2 only)
    MATCHES: '/matches',
    CREATE_MATCH: '/matches/create',
    MATCH_CONVOCATION: '/matches/:matchId/convocation',
    LIVE_MATCH: '/live-match/:matchId',
    MATCH_ANALYSIS: '/match-analysis/:matchId',

    // Players
    PLAYERS: '/players',
    PLAYER_DETAIL: '/players/:id',

    // Reports
    REPORTS_PLAYERS: '/reports/players',
    REPORTS_COACHES: '/reports/coaches',
    REPORTS_TEAM_PLANS: '/reports/team-plans',
    REPORTS_TEAM_PLAN: '/reports/team-plan/:teamId',

    // Training
    TRAINING_ATTENDANCE: '/trainings/:id/attendance',

    // Admin
    COACHES: '/coaches',
    COACH_DETAIL: '/coaches/:id',
    SETTINGS: '/settings',
    EXPORTS: '/exports',
    NEXT_SEASON: '/next-season',

    // Analytics
    ANALYTICS: '/analytics',
    STATS: '/stats',
    CLUB_DASHBOARD: '/club/dashboard',

    // Other
    ABOUT: '/about',
    CALENDARIO: '/calendario',
    SALUD_DISPONIBILIDAD: '/salud-disponibilidad',

    // Coach Signup
    SIGNUP_COACH: '/signup/coach',
} as const

/**
 * Helper functions to build routes with parameters
 */
export const buildRoute = {
    liveMatch: (matchId: string) => `/live-match/${matchId}`,
    matchAnalysis: (matchId: string) => `/match-analysis/${matchId}`,
    matchConvocation: (matchId: string) => `/matches/${matchId}/convocation`,
    teamDetail: (teamId: string) => `/teams/${teamId}`,
    teamSeasonSummary: (teamId: string, seasonId: string) => `/teams/${teamId}/season/${seasonId}/summary`,
    playerDetail: (playerId: string) => `/players/${playerId}`,
    coachDetail: (coachId: string) => `/coaches/${coachId}`,
    trainingAttendance: (trainingId: string) => `/trainings/${trainingId}/attendance`,
    teamPlan: (teamId: string) => `/reports/team-plan/${teamId}`,
}

/**
 * FORBIDDEN ROUTES - DO NOT USE
 * These routes are handled by the wizard flow
 */
export const FORBIDDEN_ROUTES = [
    '/matches/new',           // Use ROUTES.CREATE_MATCH instead
    '/matches/:id/live',      // Use ROUTES.LIVE_MATCH instead
    '/match-analysis-v2',     // Use ROUTES.MATCH_ANALYSIS instead
] as const

/**
 * Type-safe route validation
 */
export function isForbiddenRoute(route: string): boolean {
    return FORBIDDEN_ROUTES.some(forbidden =>
        route.includes(forbidden.replace(':id', ''))
    )
}
