import { supabase } from '@/lib/supabaseClient'

export interface TrainingDB {
    id: string
    team_id: string
    date: string
    title: string | null
    notes: string | null
    created_by: string | null
    created_at: string
    updated_at: string
}

export interface TrainingAttendanceDB {
    id: string
    training_id: string
    player_id: string
    status: 'present' | 'absent' | 'justified'
    reason: string | null
    created_at: string
    updated_at: string
}

export const trainingService = {
    // Create a new training
    createTraining: async (training: Omit<TrainingDB, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'title' | 'notes'> & { title?: string | null, notes?: string | null }): Promise<TrainingDB> => {
        const { data: { user } } = await supabase.auth.getUser()

        const { data, error } = await supabase
            .from('trainings')
            .insert({
                ...training,
                created_by: user?.id
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating training:', error)
            throw error
        }
        return data
    },

    // Get training by ID
    getTrainingById: async (id: string): Promise<TrainingDB | null> => {
        const { data, error } = await supabase
            .from('trainings')
            .select('*')
            .eq('id', id)
            .single()

        if (error) return null
        return data
    },

    // Get attendance for a training
    getAttendanceByTraining: async (trainingId: string): Promise<TrainingAttendanceDB[]> => {
        const { data, error } = await supabase
            .from('training_attendance')
            .select('*')
            .eq('training_id', trainingId)

        if (error) {
            console.error('Error fetching attendance:', error)
            throw error
        }
        return data
    },

    // Upsert attendance records (bulk or single)
    upsertAttendance: async (records: Omit<TrainingAttendanceDB, 'id' | 'created_at' | 'updated_at'>[]) => {
        const { data, error } = await supabase
            .from('training_attendance')
            .upsert(records, { onConflict: 'training_id,player_id' })
            .select()

        if (error) {
            console.error('Error upserting attendance:', error)
            throw error
        }
        return data
    }
}
