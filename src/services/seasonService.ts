import { supabase } from '@/lib/supabaseClient'

export interface SeasonDB {
    id: string
    club_id: string
    name: string
    start_date: string | null
    end_date: string | null
    reference_date: string
    is_current: boolean
    created_at: string
    updated_at: string
}

export const seasonService = {
    getSeasonsByClub: async (clubId: string): Promise<SeasonDB[]> => {
        const { data, error } = await supabase
            .from('seasons')
            .select('*')
            .eq('club_id', clubId)
            .order('start_date', { ascending: false })

        if (error) {
            console.error('Error fetching seasons:', error)
            throw error
        }

        return data || []
    },

    getCurrentSeasonByClub: async (clubId: string): Promise<SeasonDB | null> => {
        const { data, error } = await supabase
            .from('seasons')
            .select('*')
            .eq('club_id', clubId)
            .eq('is_current', true)
            .single()

        if (error) {
            if (error.code === 'PGRST116') return null // No rows found
            console.error('Error fetching current season:', error)
            throw error
        }

        return data
    },

    createSeason: async (season: Omit<SeasonDB, 'id' | 'created_at' | 'updated_at'>): Promise<SeasonDB> => {
        // If setting as current, unset others first (optional but good practice)
        if (season.is_current) {
            await supabase
                .from('seasons')
                .update({ is_current: false })
                .eq('club_id', season.club_id)
        }

        const { data, error } = await supabase
            .from('seasons')
            .insert(season)
            .select()
            .single()

        if (error) {
            console.error('Error creating season:', error)
            throw error
        }

        return data
    },

    updateSeason: async (id: string, updates: Partial<Omit<SeasonDB, 'id' | 'created_at' | 'updated_at'>>): Promise<SeasonDB> => {
        const { data, error } = await supabase
            .from('seasons')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating season:', error)
            throw error
        }
        return data
    },

    // Fetch a single season by its ID
    getSeasonById: async (seasonId: string): Promise<SeasonDB | null> => {
        const { data, error } = await supabase
            .from('seasons')
            .select('*')
            .eq('id', seasonId)
            .single()

        if (error) {
            if (error.code === 'PGRST116') return null // No rows found
            console.error('Error fetching season by ID:', error)
            throw error
        }
        return data
    }
}
