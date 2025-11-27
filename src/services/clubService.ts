import { supabase } from '@/lib/supabaseClient'

export interface ClubDB {
    id: string
    name: string
    acronym: string | null
    metadata: Record<string, any>
    created_at: string
    updated_at: string
}

export const clubService = {
    getClub: async (id: string): Promise<ClubDB | null> => {
        const { data, error } = await supabase
            .from('clubs')
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            console.error('Error fetching club:', error)
            return null
        }

        return data
    },

    updateClub: async (id: string, updates: Partial<ClubDB>): Promise<ClubDB | null> => {
        const { data, error } = await supabase
            .from('clubs')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating club:', error)
            throw error
        }

        return data
    },
    // Alias for getClub to match requirements
    getClubById: async (id: string): Promise<ClubDB | null> => {
        return clubService.getClub(id)
    },

    updateClubName: async (id: string, name: string, acronym?: string): Promise<ClubDB | null> => {
        if (!name || name.trim().length === 0) {
            throw new Error('El nombre del club es obligatorio')
        }

        const clubData = {
            id: id,
            name: name.trim(),
            acronym: acronym ? acronym.trim().toUpperCase() : null,
            updated_at: new Date().toISOString()
        }

        // Use upsert to handle cases where the club row might be missing
        const { data, error } = await supabase
            .from('clubs')
            .upsert(clubData, { onConflict: 'id' })
            .select()
            .single()

        if (error) {
            console.error('Error updating/creating club:', error)
            throw error
        }

        return data
    }
}
