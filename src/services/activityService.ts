import { supabase } from '@/lib/supabaseClient'
import { getTeamDisplayName } from '@/utils/teamDisplay'

export type ActivityType = 'evaluation' | 'training' | 'match'

export interface ActivityItem {
    id: string
    type: ActivityType
    timestamp: string
    playerName?: string
    teamName?: string
    description: string
    link?: string
}

/**
 * Fetch recent player evaluations
 */
async function getRecentEvaluations(clubId: string, limit: number): Promise<ActivityItem[]> {
    const { data: clubTeams, error: teamsError } = await supabase
        .from('teams')
        .select(`
            id, 
            custom_name, 
            category_stage, 
            gender,
            identifier_id,
            identifier:club_identifiers!identifier_id(name, type, code)
        `)
        .eq('club_id', clubId)

    console.log('[Evaluations] Teams data:', clubTeams)
    console.log('[Evaluations] First team identifier:', clubTeams?.[0]?.identifier)

    if (teamsError || !clubTeams) {
        console.error('[Evaluations] Teams error:', teamsError)
        return []
    }

    const teamIds = clubTeams.map(t => t.id)

    const { data, error } = await supabase
        .from('player_team_season_evaluations')
        .select('id, created_at, phase, player_id, team_id')
        .in('team_id', teamIds)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error || !data) return []

    const playerIds = [...new Set(data.map(e => e.player_id))]
    const { data: players } = await supabase
        .from('club_players')
        .select('id, first_name, last_name')
        .in('id', playerIds)

    return data.map(item => {
        const player = players?.find(p => p.id === item.player_id)
        const rawTeam = clubTeams.find(t => t.id === item.team_id)
        // Transform identifier array to single object
        const team = rawTeam ? {
            category_stage: rawTeam.category_stage,
            custom_name: rawTeam.custom_name,
            gender: rawTeam.gender,
            identifier: (Array.isArray(rawTeam.identifier) && rawTeam.identifier.length > 0)
                ? rawTeam.identifier[0]
                : null
        } : null
        const teamName = team ? getTeamDisplayName(team) : 'Equipo'

        const phaseLabel = item.phase === 'start' ? 'Inicio' : item.phase === 'mid' ? 'Mitad' : 'Final'

        return {
            id: item.id,
            type: 'evaluation' as ActivityType,
            timestamp: item.created_at,
            playerName: player ? `${player.first_name} ${player.last_name}` : 'Jugadora',
            teamName,
            description: `Evaluación creada (${phaseLabel})`,
            link: `/players/${item.player_id}`
        }
    })
}

/**
 * Fetch recent trainings
 */
async function getRecentTrainings(clubId: string, limit: number): Promise<ActivityItem[]> {
    const { data: clubTeams, error: teamsError } = await supabase
        .from('teams')
        .select(`
            id, 
            custom_name, 
            category_stage, 
            gender,
            identifier_id,
            identifier:club_identifiers!identifier_id(name, type, code)
        `)
        .eq('club_id', clubId)

    if (teamsError || !clubTeams) return []

    const teamIds = clubTeams.map(t => t.id)

    const { data, error } = await supabase
        .from('trainings')
        .select('id, created_at, date, title, team_id')
        .in('team_id', teamIds)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('[Trainings] Error:', error)
        return []
    }

    if (!data) return []

    return data.map(item => {
        const rawTeam = clubTeams.find(t => t.id === item.team_id)
        // Transform identifier array to single object
        const team = rawTeam ? {
            category_stage: rawTeam.category_stage,
            custom_name: rawTeam.custom_name,
            gender: rawTeam.gender,
            identifier: (Array.isArray(rawTeam.identifier) && rawTeam.identifier.length > 0)
                ? rawTeam.identifier[0]
                : null
        } : null
        const teamName = team ? getTeamDisplayName(team) : 'Equipo'

        return {
            id: item.id,
            type: 'training' as ActivityType,
            timestamp: item.created_at,
            teamName,
            description: item.title || 'Entrenamiento registrado',
            link: `/training-plans/${item.team_id}`
        }
    })
}

/**
 * Fetch recent matches
 */
async function getRecentMatches(clubId: string, limit: number): Promise<ActivityItem[]> {
    const { data: clubTeams, error: teamsError } = await supabase
        .from('teams')
        .select(`
            id, 
            custom_name, 
            category_stage, 
            gender,
            identifier_id,
            identifier:club_identifiers!identifier_id(name, type, code)
        `)
        .eq('club_id', clubId)

    if (teamsError || !clubTeams) return []

    const teamIds = clubTeams.map(t => t.id)

    const { data, error } = await supabase
        .from('matches')
        .select('id, created_at, match_date, opponent_name, status, team_id')
        .in('team_id', teamIds)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('[Matches] Error:', error)
        return []
    }

    if (!data) return []

    return data.map(item => {
        const rawTeam = clubTeams.find(t => t.id === item.team_id)
        // Transform identifier array to single object
        const team = rawTeam ? {
            category_stage: rawTeam.category_stage,
            custom_name: rawTeam.custom_name,
            gender: rawTeam.gender,
            identifier: (Array.isArray(rawTeam.identifier) && rawTeam.identifier.length > 0)
                ? rawTeam.identifier[0]
                : null
        } : null
        const teamName = team ? getTeamDisplayName(team) : 'Equipo'

        const action = item.status === 'completed' || item.status === 'finished' ? 'finalizado' : 'creado'

        return {
            id: item.id,
            type: 'match' as ActivityType,
            timestamp: item.created_at,
            teamName,
            description: `Partido ${action} vs ${item.opponent_name || 'rival'}`,
            link: `/matches`
        }
    })
}

/**
 * Get recent activities from all sources
 */
export async function getRecentActivities(clubId: string, limit: number = 10): Promise<ActivityItem[]> {
    try {
        // Fetch from all sources
        const [evaluations, trainings, matches] = await Promise.all([
            getRecentEvaluations(clubId, limit),
            getRecentTrainings(clubId, limit),
            getRecentMatches(clubId, limit)
        ])

        // Combine and sort
        const allActivities = [...evaluations, ...trainings, ...matches]
        allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

        return allActivities.slice(0, limit)
    } catch (error) {
        console.error('[ActivityService] Error fetching activities:', error)
        return []
    }
}
