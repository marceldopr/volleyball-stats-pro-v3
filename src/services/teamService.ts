import { supabase } from '@/lib/supabaseClient'
import { sortTeamsBySportsCategory } from '@/utils/teamSorting'

export interface TeamDB {
    id: string
    club_id: string
    season_id: string
    custom_name: string | null
    category: string // Legacy field, keeping for now
    category_stage: 'Benjamín' | 'Alevín' | 'Infantil' | 'Cadete' | 'Juvenil' | 'Júnior' | 'Sénior'
    division_name: string | null
    team_suffix: string | null
    gender: 'female' | 'male' | 'mixed'
    competition_level: string | null
    head_coach_id: string | null
    assistant_coach_id: string | null
    identifier_id: string | null  // Reference to club_identifiers
    notes: string | null
    created_at: string
    updated_at: string
    player_team_season?: { id: string }[]
    // Embedded identifier from join (Supabase returns object for FK join)
    identifier?: {
        id: string
        name: string
        type: 'letter' | 'color'
        code: string | null
        color_hex: string | null
        sort_order?: number  // Added for proper ordering
    } | null
}

export const teamService = {
    // Helper to normalize identifier from Supabase join (may be array or object)
    _normalizeIdentifier: (team: any): TeamDB => {
        if (team.identifier && Array.isArray(team.identifier)) {
            team.identifier = team.identifier[0] || null
        }
        return team as TeamDB
    },

    // Fetch all teams for a club (regardless of season)
    getTeamsByClub: async (clubId: string): Promise<TeamDB[]> => {
        const { data, error } = await supabase
            .from('teams')
            .select('id, club_id, season_id, custom_name, category, category_stage, division_name, team_suffix, gender, competition_level, head_coach_id, assistant_coach_id, identifier_id, notes, created_at, updated_at, identifier:club_identifiers(id, name, type, code, color_hex, sort_order)')
            .eq('club_id', clubId)
        // NO .order() here - sorting is done in-memory by sortTeamsBySportsCategory

        if (error) throw error
        const normalizedTeams = (data || []).map(teamService._normalizeIdentifier)
        return sortTeamsBySportsCategory(normalizedTeams)
    },

    // Fetch teams for a club in a specific season
    getTeamsByClubAndSeason: async (clubId: string, seasonId: string): Promise<TeamDB[]> => {
        const { data, error } = await supabase
            .from('teams')
            .select('id, club_id, season_id, custom_name, category, category_stage, division_name, team_suffix, gender, competition_level, head_coach_id, assistant_coach_id, identifier_id, notes, created_at, updated_at, player_team_season(id), identifier:club_identifiers(id, name, type, code, color_hex, sort_order)')
            .eq('club_id', clubId)
            .eq('season_id', seasonId)
        // NO .order() here - sorting is done in-memory by sortTeamsBySportsCategory

        if (error) {
            console.error('Error fetching teams:', error)
            throw error
        }
        const normalizedTeams = (data || []).map(teamService._normalizeIdentifier)
        return sortTeamsBySportsCategory(normalizedTeams)
    },

    // Fetch specific teams by their IDs
    getTeamsByIds: async (teamIds: string[]): Promise<TeamDB[]> => {
        if (!teamIds || teamIds.length === 0) return []

        const { data, error } = await supabase
            .from('teams')
            .select('id, club_id, season_id, custom_name, category, category_stage, division_name, team_suffix, gender, competition_level, head_coach_id, assistant_coach_id, identifier_id, notes, created_at, updated_at, identifier:club_identifiers(id, name, type, code, color_hex, sort_order)')
            .in('id', teamIds)
        // NO .order() here - sorting is done in-memory by sortTeamsBySportsCategory

        if (error) {
            console.error('Error fetching teams by IDs:', error)
            throw error
        }
        const normalizedTeams = (data || []).map(teamService._normalizeIdentifier)
        return sortTeamsBySportsCategory(normalizedTeams)
    },

    // Create a new team for a club/season
    createTeam: async (team: Omit<TeamDB, 'id' | 'created_at' | 'updated_at' | 'identifier' | 'player_team_season'>): Promise<TeamDB> => {
        // Exclude any virtual fields that might have been passed
        const { identifier, player_team_season, ...insertData } = team as any

        const { data, error } = await supabase
            .from('teams')
            .insert(insertData)
            .select('*, identifier:club_identifiers(id, name, type, code, color_hex)')
            .single()

        if (error) {
            console.error('Error creating team:', error.message, error.details, error.hint)
            throw error
        }
        return teamService._normalizeIdentifier(data)
    },

    // Update an existing team
    updateTeam: async (id: string, updates: Partial<Omit<TeamDB, 'id' | 'created_at' | 'updated_at'>>): Promise<TeamDB> => {
        const { data, error } = await supabase
            .from('teams')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating team:', error)
            throw error
        }
        return data
    },

    // Delete a team by ID
    deleteTeam: async (id: string): Promise<void> => {
        const { error } = await supabase.from('teams').delete().eq('id', id)
        if (error) {
            console.error('Error deleting team:', error)
            throw error
        }
    },

    // Fetch a single team by its ID
    getTeamById: async (teamId: string): Promise<TeamDB | null> => {
        const { data, error } = await supabase
            .from('teams')
            .select(`
                id, 
                club_id, 
                season_id, 
                custom_name, 
                category, 
                category_stage, 
                division_name, 
                team_suffix, 
                gender, 
                competition_level, 
                head_coach_id, 
                assistant_coach_id, 
                identifier_id, 
                notes, 
                created_at, 
                updated_at,
                identifier:club_identifiers!identifier_id(name, type, code)
            `)
            .eq('id', teamId)
            .single()

        if (error) {
            if (error.code === 'PGRST116') return null // No rows found
            console.error('Error fetching team by ID:', error)
            throw error
        }

        // Transform identifier array to single object
        if (data) {
            const result: any = { ...data }
            if (Array.isArray(data.identifier) && data.identifier.length > 0) {
                result.identifier = data.identifier[0]
            } else if (Array.isArray(data.identifier)) {
                result.identifier = null
            }
            return result
        }

        return data
    },

    // Fetch players for a specific team (CURRENT SEASON)
    // This assumes players are linked via player_team_season
    getTeamPlayers: async (teamId: string): Promise<any[]> => {
        const { data, error } = await supabase
            .from('player_team_season')
            .select(`
                player:club_players (
                    *
                )
            `)
            .eq('team_id', teamId)

        if (error) {
            console.error('Error fetching team players:', error)
            throw error
        }

        // Flatten the structure
        return (data || []).map((item: any) => ({
            ...item.player,
            // If number is in player_team_season, use it. If not, use player number?
            // Assuming simplified logic for now: player object returned directly
        }))
    }
}
