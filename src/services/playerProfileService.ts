import { supabase } from '@/lib/supabaseClient'

// ================================================================
// TypeScript Interfaces
// ================================================================

export interface PlayerGuardian {
    id: string
    player_id: string
    full_name: string
    relationship: 'padre' | 'madre' | 'tutor' | 'otro'
    phone: string | null
    email: string | null
    is_primary: boolean
    created_at: string
}

export interface PlayerDocuments {
    id: string
    player_id: string
    federation_ok: boolean
    image_consent: boolean
    medical_cert_ok: boolean
    notes: string | null
    updated_at: string
}

export interface PlayerMeasurement {
    id: string
    player_id: string
    season_id: string | null
    measured_at: string
    height_cm: number | null
    weight_kg: number | null
    vertical_jump_cm: number | null
    wingspan_cm: number | null
    notes: string | null
    created_at: string
}

export interface PlayerInjury {
    id: string
    player_id: string
    season_id: string | null
    start_date: string
    end_date: string | null
    injury_type: string | null
    notes: string | null
    is_active: boolean
    created_at: string
}

// ================================================================
// Service Methods
// ================================================================

export const playerProfileService = {
    // ============================================================
    // GUARDIANS
    // ============================================================

    getGuardians: async (playerId: string): Promise<PlayerGuardian[]> => {
        const { data, error } = await supabase
            .from('player_guardians')
            .select('*')
            .eq('player_id', playerId)
            .order('is_primary', { ascending: false })
            .order('created_at', { ascending: true })

        if (error) throw error
        return data || []
    },

    createGuardian: async (guardianData: Omit<PlayerGuardian, 'id' | 'created_at'>): Promise<PlayerGuardian> => {
        const { data, error } = await supabase
            .from('player_guardians')
            .insert(guardianData)
            .select()
            .single()

        if (error) throw error
        return data
    },

    updateGuardian: async (id: string, guardianData: Partial<PlayerGuardian>): Promise<void> => {
        const { error } = await supabase
            .from('player_guardians')
            .update(guardianData)
            .eq('id', id)

        if (error) throw error
    },

    deleteGuardian: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('player_guardians')
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    // ============================================================
    // DOCUMENTS
    // ============================================================

    getDocuments: async (playerId: string): Promise<PlayerDocuments | null> => {
        const { data, error } = await supabase
            .from('player_documents')
            .select('*')
            .eq('player_id', playerId)
            .single()

        if (error) {
            // If no documents exist yet, return null
            if (error.code === 'PGRST116') return null
            throw error
        }
        return data
    },

    upsertDocuments: async (playerId: string, documentsData: Partial<PlayerDocuments>): Promise<PlayerDocuments> => {
        const { data, error } = await supabase
            .from('player_documents')
            .upsert({
                player_id: playerId,
                ...documentsData,
                updated_at: new Date().toISOString()
            }, { onConflict: 'player_id' })
            .select()
            .single()

        if (error) throw error
        return data
    },

    // ============================================================
    // MEASUREMENTS
    // ============================================================

    getMeasurements: async (playerId: string): Promise<PlayerMeasurement[]> => {
        const { data, error } = await supabase
            .from('player_measurements')
            .select('*')
            .eq('player_id', playerId)
            .order('measured_at', { ascending: false })

        if (error) throw error
        return data || []
    },

    getLatestMeasurement: async (playerId: string): Promise<PlayerMeasurement | null> => {
        const { data, error } = await supabase
            .from('player_measurements')
            .select('*')
            .eq('player_id', playerId)
            .order('measured_at', { ascending: false })
            .limit(1)
            .single()

        if (error) {
            if (error.code === 'PGRST116') return null
            throw error
        }
        return data
    },

    createMeasurement: async (measurementData: Omit<PlayerMeasurement, 'id' | 'created_at'>): Promise<PlayerMeasurement> => {
        const { data, error } = await supabase
            .from('player_measurements')
            .insert(measurementData)
            .select()
            .single()

        if (error) throw error
        return data
    },

    deleteMeasurement: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('player_measurements')
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    // ============================================================
    // INJURIES
    // ============================================================

    getInjuries: async (playerId: string): Promise<PlayerInjury[]> => {
        const { data, error } = await supabase
            .from('player_injuries')
            .select('*')
            .eq('player_id', playerId)
            .order('start_date', { ascending: false })

        if (error) throw error
        return data || []
    },

    getActiveInjury: async (playerId: string, seasonId?: string): Promise<PlayerInjury | null> => {
        let query = supabase
            .from('player_injuries')
            .select('*')
            .eq('player_id', playerId)
            .eq('is_active', true)

        if (seasonId) {
            query = query.eq('season_id', seasonId)
        }

        const { data, error } = await query
            .order('start_date', { ascending: false })
            .limit(1)
            .single()

        if (error) {
            if (error.code === 'PGRST116') return null
            throw error
        }
        return data
    },

    createInjury: async (injuryData: Omit<PlayerInjury, 'id' | 'created_at'>): Promise<PlayerInjury> => {
        const { data, error } = await supabase
            .from('player_injuries')
            .insert(injuryData)
            .select()
            .single()

        if (error) throw error
        return data
    },

    closeInjury: async (id: string, endDate: string): Promise<void> => {
        const { error } = await supabase
            .from('player_injuries')
            .update({
                end_date: endDate,
                is_active: false
            })
            .eq('id', id)

        if (error) throw error
    },

    updateInjury: async (id: string, injuryData: Partial<PlayerInjury>): Promise<void> => {
        const { error } = await supabase
            .from('player_injuries')
            .update(injuryData)
            .eq('id', id)

        if (error) throw error
    }
}
