/**
 * Identifier Service - Manages club line identifiers (A, B, C or colors)
 * 
 * Identifiers are:
 * - Club-global (not season-specific)
 * - Used to distinguish teams within same category (e.g., Cadete A, Cadete B)
 * - Can be letters or colors
 */

import { supabase } from '@/lib/supabaseClient'
import { auditService } from './auditService'

export interface IdentifierDB {
    id: string
    club_id: string
    name: string                    // "Taronja", "A", "B"
    type: 'letter' | 'color'
    color_hex: string | null        // "#FF6600" (only for type='color')
    code: string | null             // Short code: "A", "B", "TRJ"
    is_active: boolean
    sort_order: number
    created_at: string
    updated_at: string
}

export type IdentifierCreate = Omit<IdentifierDB, 'id' | 'created_at' | 'updated_at'>
export type IdentifierUpdate = Partial<Omit<IdentifierDB, 'id' | 'club_id' | 'created_at' | 'updated_at'>>

export const identifierService = {
    // Get all identifiers for a club
    getIdentifiersByClub: async (clubId: string): Promise<IdentifierDB[]> => {
        const { data, error } = await supabase
            .from('club_identifiers')
            .select('*')
            .eq('club_id', clubId)
            .order('sort_order', { ascending: true })

        if (error) {
            console.error('Error fetching identifiers:', error)
            throw error
        }

        return data || []
    },

    // Get active identifiers only
    getActiveIdentifiers: async (clubId: string): Promise<IdentifierDB[]> => {
        const { data, error } = await supabase
            .from('club_identifiers')
            .select('*')
            .eq('club_id', clubId)
            .eq('is_active', true)
            .order('sort_order', { ascending: true })

        if (error) {
            console.error('Error fetching active identifiers:', error)
            throw error
        }

        return data || []
    },

    // Get a single identifier by ID
    getIdentifierById: async (id: string): Promise<IdentifierDB | null> => {
        const { data, error } = await supabase
            .from('club_identifiers')
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            if (error.code === 'PGRST116') return null
            console.error('Error fetching identifier:', error)
            throw error
        }

        return data
    },

    // Create a new identifier
    createIdentifier: async (identifier: IdentifierCreate): Promise<IdentifierDB> => {
        const { data, error } = await supabase
            .from('club_identifiers')
            .insert(identifier)
            .select()
            .single()

        if (error) {
            console.error('Error creating identifier:', error)
            throw error
        }

        return data
    },

    // Update an identifier
    updateIdentifier: async (id: string, updates: IdentifierUpdate): Promise<IdentifierDB> => {
        const { data, error } = await supabase
            .from('club_identifiers')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating identifier:', error)
            throw error
        }

        return data
    },

    // Delete an identifier
    deleteIdentifier: async (id: string): Promise<void> => {
        // Fetch identifier data for audit log before deletion
        const { data: identifier } = await supabase
            .from('club_identifiers')
            .select('*')
            .eq('id', id)
            .single()

        // Log to audit before deletion
        if (identifier) {
            await auditService.logDeletion({
                actionType: 'DELETE',
                entityType: 'identifier',
                entityId: id,
                entityName: identifier.name,
                clubId: identifier.club_id,
                entitySnapshot: identifier
            })
        }

        const { error } = await supabase
            .from('club_identifiers')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting identifier:', error)
            throw error
        }
    },

    // Toggle active status
    toggleActive: async (id: string, isActive: boolean): Promise<void> => {
        const { error } = await supabase
            .from('club_identifiers')
            .update({ is_active: isActive, updated_at: new Date().toISOString() })
            .eq('id', id)

        if (error) {
            console.error('Error toggling identifier active status:', error)
            throw error
        }
    },

    // Reorder identifiers
    reorderIdentifiers: async (orders: { id: string, sort_order: number }[]): Promise<void> => {
        for (const { id, sort_order } of orders) {
            const { error } = await supabase
                .from('club_identifiers')
                .update({ sort_order, updated_at: new Date().toISOString() })
                .eq('id', id)

            if (error) {
                console.error('Error reordering identifier:', error)
                throw error
            }
        }
    }
}
