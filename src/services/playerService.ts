import { supabase } from '@/lib/supabaseClient'

export interface PlayerDB {
    id: string
    club_id: string
    first_name: string
    last_name: string
    gender: 'female' | 'male'
    birth_date: string
    main_position: 'S' | 'OH' | 'MB' | 'OPP' | 'L' | string
    secondary_position: string | null
    dominant_hand: 'left' | 'right' | null
    height_cm?: number | null
    weight_kg?: number | null
    notes: string | null
    is_active: boolean
    created_at: string
    updated_at: string
}

export const playerService = {
    getPlayersByClub: async (clubId: string): Promise<PlayerDB[]> => {
        const { data, error } = await supabase
            .from('club_players')
            .select('*')
            .eq('club_id', clubId)
            .order('first_name', { ascending: true })

        if (error) throw error
        return data
    },

    createPlayer: async (player: Omit<PlayerDB, 'id' | 'created_at' | 'updated_at'>): Promise<PlayerDB> => {
        const { data, error } = await supabase
            .from('club_players')
            .insert(player)
            .select()
            .single()

        if (error) throw error
        return data
    },

    updatePlayer: async (id: string, player: Partial<PlayerDB>): Promise<PlayerDB> => {
        const { data, error } = await supabase
            .from('club_players')
            .update(player)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    deletePlayer: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('club_players')
            .delete()
            .eq('id', id)

        if (error) throw error
    }
}
