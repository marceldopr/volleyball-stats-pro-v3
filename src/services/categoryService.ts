/**
 * Category Service - Manages club category definitions
 * 
 * Categories are:
 * - Hierarchical (order defines promotion path)
 * - Gender-specific (separate hierarchies for M/F)
 * - Season-independent (configured once, reused each season)
 */

import { supabase } from '@/lib/supabaseClient'
import { auditService } from './auditService'

export interface CategoryDB {
    id: string
    club_id: string
    name: string                    // Benjamín, Alevín, Infantil, etc.
    code: string | null             // U10, U12, U14, etc.
    gender: 'female' | 'male'
    min_age: number | null          // Orientative, not blocking
    max_age: number | null          // Orientative, not blocking
    sort_order: number              // Defines hierarchy (lower = younger)
    is_active: boolean
    created_at: string
    updated_at: string
}

export type CategoryCreate = Omit<CategoryDB, 'id' | 'created_at' | 'updated_at'>
export type CategoryUpdate = Partial<Omit<CategoryDB, 'id' | 'club_id' | 'created_at' | 'updated_at'>>

// Default categories for new clubs (Spanish federation standard)
export const DEFAULT_CATEGORIES: Omit<CategoryCreate, 'club_id'>[] = [
    { name: 'Benjamín', code: 'U10', gender: 'female', min_age: 0, max_age: 9, sort_order: 1, is_active: true },
    { name: 'Alevín', code: 'U12', gender: 'female', min_age: 10, max_age: 11, sort_order: 2, is_active: true },
    { name: 'Infantil', code: 'U14', gender: 'female', min_age: 12, max_age: 13, sort_order: 3, is_active: true },
    { name: 'Cadete', code: 'U16', gender: 'female', min_age: 14, max_age: 15, sort_order: 4, is_active: true },
    { name: 'Juvenil', code: 'U18', gender: 'female', min_age: 16, max_age: 17, sort_order: 5, is_active: true },
    { name: 'Júnior', code: 'U21', gender: 'female', min_age: 18, max_age: 20, sort_order: 6, is_active: true },
    { name: 'Sénior', code: null, gender: 'female', min_age: 21, max_age: null, sort_order: 7, is_active: true },
    // Male categories
    { name: 'Benjamín', code: 'U10', gender: 'male', min_age: 0, max_age: 9, sort_order: 1, is_active: true },
    { name: 'Alevín', code: 'U12', gender: 'male', min_age: 10, max_age: 11, sort_order: 2, is_active: true },
    { name: 'Infantil', code: 'U14', gender: 'male', min_age: 12, max_age: 13, sort_order: 3, is_active: true },
    { name: 'Cadete', code: 'U16', gender: 'male', min_age: 14, max_age: 15, sort_order: 4, is_active: true },
    { name: 'Juvenil', code: 'U18', gender: 'male', min_age: 16, max_age: 17, sort_order: 5, is_active: true },
    { name: 'Júnior', code: 'U21', gender: 'male', min_age: 18, max_age: 20, sort_order: 6, is_active: true },
    { name: 'Sénior', code: null, gender: 'male', min_age: 21, max_age: null, sort_order: 7, is_active: true },
]

export const categoryService = {
    // Get all categories for a club
    getCategoriesByClub: async (clubId: string): Promise<CategoryDB[]> => {
        const { data, error } = await supabase
            .from('club_categories')
            .select('*')
            .eq('club_id', clubId)
            .order('gender', { ascending: true })
            .order('sort_order', { ascending: true })

        if (error) {
            console.error('Error fetching categories:', error)
            throw error
        }

        return data || []
    },

    // Get categories by gender
    getCategoriesByGender: async (clubId: string, gender: 'female' | 'male'): Promise<CategoryDB[]> => {
        const { data, error } = await supabase
            .from('club_categories')
            .select('*')
            .eq('club_id', clubId)
            .eq('gender', gender)
            .order('sort_order', { ascending: true })

        if (error) {
            console.error('Error fetching categories by gender:', error)
            throw error
        }

        return data || []
    },

    // Create a new category
    createCategory: async (category: CategoryCreate): Promise<CategoryDB> => {
        const { data, error } = await supabase
            .from('club_categories')
            .insert(category)
            .select()
            .single()

        if (error) {
            console.error('Error creating category:', error)
            throw error
        }

        return data
    },

    // Update a category
    updateCategory: async (id: string, updates: CategoryUpdate): Promise<CategoryDB> => {
        const { data, error } = await supabase
            .from('club_categories')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating category:', error)
            throw error
        }

        return data
    },

    // Delete a category
    deleteCategory: async (id: string): Promise<void> => {
        // Fetch category data for audit log before deletion
        const { data: category } = await supabase
            .from('club_categories')
            .select('*')
            .eq('id', id)
            .single()

        // Log to audit before deletion
        if (category) {
            await auditService.logDeletion({
                actionType: 'DELETE',
                entityType: 'category',
                entityId: id,
                entityName: category.name,
                clubId: category.club_id,
                entitySnapshot: category
            })
        }

        const { error } = await supabase
            .from('club_categories')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting category:', error)
            throw error
        }
    },

    // Reorder categories (update sort_order for multiple categories)
    reorderCategories: async (categoryOrders: { id: string, sort_order: number }[]): Promise<void> => {
        // Update each category's sort_order
        for (const { id, sort_order } of categoryOrders) {
            const { error } = await supabase
                .from('club_categories')
                .update({ sort_order, updated_at: new Date().toISOString() })
                .eq('id', id)

            if (error) {
                console.error('Error reordering category:', error)
                throw error
            }
        }
    },

    // Initialize default categories for a new club
    initializeDefaultCategories: async (clubId: string): Promise<void> => {
        const categoriesToCreate = DEFAULT_CATEGORIES.map(cat => ({
            ...cat,
            club_id: clubId
        }))

        const { error } = await supabase
            .from('club_categories')
            .insert(categoriesToCreate)

        if (error) {
            console.error('Error initializing default categories:', error)
            throw error
        }
    }
}
