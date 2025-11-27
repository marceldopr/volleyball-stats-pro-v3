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
    }
}
