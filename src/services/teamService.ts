import { supabase } from '@/lib/supabaseClient'

export interface TeamDB {
    id: string
    club_id: string
    season_id: string
    name: string
    category: string
    gender: 'female' | 'male' | 'mixed' | string
    competition_level: string | null
    head_coach_id: string | null
    assistant_coach_id: string | null
    notes: string | null
    created_at: string
    updated_at: string
}

export const teamService = {
    // Fetch teams for a club in a specific season
    getTeamsByClubAndSeason: async (clubId: string, seasonId: string): Promise<TeamDB[]> => {
        const { data, error } = await supabase
            .from('teams')
            .select('*')
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
    createTeam: async (
        clubId: string,
        seasonId: string,
        data: { name: string; category: string; gender: string; competition_level?: string; notes?: string }
    ): Promise<TeamDB> => {
        const { data: newTeam, error } = await supabase
            .from('teams')
            .insert({ club_id: clubId, season_id: seasonId, ...data })
            .select()
            .single()

        if (error) {
            console.error('Error creating team:', error)
            throw error
        }
        return newTeam
    },

    // Update an existing team
    updateTeam: async (id: string, data: Partial<TeamDB>): Promise<TeamDB> => {
        const { data: updatedTeam, error } = await supabase
            .from('teams')
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating team:', error)
            throw error
        }
        return updatedTeam
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
