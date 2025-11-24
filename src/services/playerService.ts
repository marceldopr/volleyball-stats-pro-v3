import { supabase } from '@/lib/supabaseClient'

export interface PlayerDB {
    id: string
    club_id: string
    first_name: string
    last_name: string
    birth_date: string | null
    main_position: 'S' | 'OH' | 'MB' | 'OPP' | 'L' | string
    secondary_position: string | null
    dominant_hand: 'left' | 'right' | null
    height_cm: number | null
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
            .order('last_name', { ascending: true })

        if (error) {
            console.error('Error fetching players:', error)
            throw error
        }

        return data || []
    },

    createPlayer: async (
        clubId: string,
        data: Omit<PlayerDB, 'id' | 'club_id' | 'created_at' | 'updated_at'>
    ): Promise<PlayerDB> => {
        const { data: newPlayer, error } = await supabase
            .from('club_players')
            .insert({
                club_id: clubId,
                ...data,
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating player:', error)
            throw error
        }

        return newPlayer
    },

    updatePlayer: async (id: string, data: Partial<PlayerDB>): Promise<PlayerDB> => {
        const { data: updatedPlayer, error } = await supabase
            .from('club_players')
            .update({
                ...data,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating player:', error)
            throw error
        }

        return updatedPlayer
    },
}
