import { supabase } from '@/lib/supabaseClient'
import { Space } from '@/types/spacesTypes'

export interface SpaceDB {
    id: string
    club_id: string
    name: string
    type: 'interior' | 'exterior'
    capacity?: number
    notes?: string
    is_active: boolean
    created_at: string
    updated_at: string
}

// Convert DB format to app format
function dbToSpace(dbSpace: SpaceDB): Space {
    return {
        id: dbSpace.id,
        clubId: dbSpace.club_id,
        name: dbSpace.name,
        type: dbSpace.type,
        capacity: dbSpace.capacity,
        notes: dbSpace.notes,
        isActive: dbSpace.is_active,
        createdAt: dbSpace.created_at,
        updatedAt: dbSpace.updated_at
    }
}

// Convert app format to DB format
function spaceToDb(space: Partial<Space>): Partial<SpaceDB> {
    const db: Partial<SpaceDB> = {}
    if (space.clubId !== undefined) db.club_id = space.clubId
    if (space.name !== undefined) db.name = space.name
    if (space.type !== undefined) db.type = space.type
    if (space.capacity !== undefined) db.capacity = space.capacity
    if (space.notes !== undefined) db.notes = space.notes
    if (space.isActive !== undefined) db.is_active = space.isActive
    return db
}

export const spacesService = {
    /**
     * Get all spaces for a specific club
     */
    async getSpacesByClubId(clubId: string) {
        const { data, error } = await supabase
            .from('spaces')
            .select('*')
            .eq('club_id', clubId)
            .order('name')

        if (error) throw error
        return (data as SpaceDB[]).map(dbToSpace)
    },

    /**
     * Create a new space
     */
    async createSpace(space: Omit<Space, 'id' | 'createdAt' | 'updatedAt'>) {
        const dbSpace = spaceToDb(space)

        const { data, error } = await supabase
            .from('spaces')
            .insert(dbSpace)
            .select()
            .single()

        if (error) throw error
        return dbToSpace(data as SpaceDB)
    },

    /**
     * Update an existing space
     */
    async updateSpace(id: string, updates: Partial<Space>) {
        const dbUpdates = spaceToDb(updates)

        const { data, error } = await supabase
            .from('spaces')
            .update(dbUpdates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return dbToSpace(data as SpaceDB)
    },

    /**
     * Delete a space
     */
    async deleteSpace(id: string) {
        const { error } = await supabase
            .from('spaces')
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    /**
     * Toggle space active status
     */
    async toggleSpaceActive(id: string, currentStatus: boolean) {
        return this.updateSpace(id, { isActive: !currentStatus })
    }
}
