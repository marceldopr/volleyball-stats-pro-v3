import { supabase } from '@/lib/supabaseClient'

export interface TeamDB {
    id: string
    club_id: string
    season_id: string
    name: string
    category: string // Legacy field, keeping for now
    category_stage: 'Benjamín' | 'Alevín' | 'Infantil' | 'Cadete' | 'Juvenil' | 'Júnior' | 'Sénior'
    division_name: string | null
    team_suffix: string | null
    gender: 'female' | 'male' | 'mixed'
    competition_level: string | null
    head_coach_id: string | null
    assistant_coach_id: string | null
    notes: string | null
    created_at: string
    updated_at: string
    player_team_season?: { id: string }[]
}

export const teamService = {
    // Fetch teams for a club in a specific season
    getTeamsByClubAndSeason: async (clubId: string, seasonId: string): Promise<TeamDB[]> => {
        const { data, error } = await supabase
            .from('teams')
            .select('*, player_team_season(id)')
            .eq('club_id', clubId)
            .eq('season_id', seasonId)
            .order('name', { ascending: true })

        if (error) {
            console.error('Error fetching teams:', error)
            throw error
        }
        return data || []
    },

    // Create a new team for a club/season
    createTeam: async (team: Omit<TeamDB, 'id' | 'created_at' | 'updated_at'>): Promise<TeamDB> => {
        const { data, error } = await supabase
            .from('teams')
            .insert(team)
            .select()
            .single()

        if (error) {
            console.error('Error creating team:', error)
            throw error
        }
        return data
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
        const { data, error } = await supabase.from('teams').select('*').eq('id', teamId).single()
        if (error) {
            if (error.code === 'PGRST116') return null // No rows found
            console.error('Error fetching team by ID:', error)
            throw error
        }
        return data
    }
}
