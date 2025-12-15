import { supabase } from '@/lib/supabaseClient'

export type SeasonStatus = 'draft' | 'active' | 'archived'

export interface SeasonDB {
    id: string
    club_id: string
    name: string
    start_date: string | null
    end_date: string | null
    reference_date: string
    is_current: boolean
    status: SeasonStatus
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
    },

    // Get seasons by status (draft, active, archived)
    getSeasonsByStatus: async (clubId: string, status: SeasonStatus): Promise<SeasonDB[]> => {
        const { data, error } = await supabase
            .from('seasons')
            .select('*')
            .eq('club_id', clubId)
            .eq('status', status)
            .order('start_date', { ascending: false })

        if (error) {
            console.error('Error fetching seasons by status:', error)
            throw error
        }
        return data || []
    },

    // Get the currently active season for a club
    getActiveSeason: async (clubId: string): Promise<SeasonDB | null> => {
        const { data, error } = await supabase
            .from('seasons')
            .select('*')
            .eq('club_id', clubId)
            .eq('status', 'active')
            .single()

        if (error) {
            if (error.code === 'PGRST116') return null
            console.error('Error fetching active season:', error)
            throw error
        }
        return data
    },

    // Set a season as active (archives the current active one)
    setActiveSeason: async (clubId: string, seasonId: string): Promise<SeasonDB> => {
        // 1. Validate the season has start_date and end_date
        const targetSeason = await seasonService.getSeasonById(seasonId)
        if (!targetSeason) {
            throw new Error('Season not found')
        }
        if (!targetSeason.start_date || !targetSeason.end_date) {
            throw new Error('Cannot activate a season without start and end dates defined')
        }
        if (targetSeason.status === 'active') {
            throw new Error('Season is already active')
        }

        // 2. Archive current active season (if any)
        const { error: archiveError } = await supabase
            .from('seasons')
            .update({ status: 'archived', is_current: false, updated_at: new Date().toISOString() })
            .eq('club_id', clubId)
            .eq('status', 'active')

        if (archiveError) {
            console.error('Error archiving current season:', archiveError)
            throw archiveError
        }

        // 3. Activate the target season
        const { data, error } = await supabase
            .from('seasons')
            .update({ status: 'active', is_current: true, updated_at: new Date().toISOString() })
            .eq('id', seasonId)
            .select()
            .single()

        if (error) {
            console.error('Error activating season:', error)
            throw error
        }

        return data
    },

    // Create a new draft season
    createDraftSeason: async (clubId: string, name: string, startDate?: string, endDate?: string): Promise<SeasonDB> => {
        const { data, error } = await supabase
            .from('seasons')
            .insert({
                club_id: clubId,
                name,
                start_date: startDate || null,
                end_date: endDate || null,
                reference_date: new Date().toISOString(),
                is_current: false,
                status: 'draft'
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating draft season:', error)
            throw error
        }
        return data
    }
}
