import { create } from 'zustand'
import { Space } from '@/types/spacesTypes'
import { spacesService } from '@/services/spacesService'

interface SpacesStore {
    spaces: Space[]
    loading: boolean
    error: string | null
    loadSpaces: (clubId: string) => Promise<void>
    addSpace: (space: Omit<Space, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
    updateSpace: (spaceId: string, updates: Partial<Space>) => Promise<void>
    deleteSpace: (spaceId: string) => Promise<void>
    toggleSpaceActive: (spaceId: string) => Promise<void>
}

export const useSpacesStore = create<SpacesStore>((set, get) => ({
    spaces: [],
    loading: false,
    error: null,

    loadSpaces: async (clubId: string) => {
        set({ loading: true, error: null })
        try {
            const spaces = await spacesService.getSpacesByClubId(clubId)
            set({ spaces, loading: false })
        } catch (error) {
            console.error('Error loading spaces:', error)
            set({ error: 'Failed to load spaces', loading: false })
        }
    },

    addSpace: async (space) => {
        set({ loading: true, error: null })
        try {
            const newSpace = await spacesService.createSpace(space)
            set((state) => ({
                spaces: [...state.spaces, newSpace],
                loading: false
            }))
        } catch (error) {
            console.error('Error adding space:', error)
            set({ error: 'Failed to add space', loading: false })
            throw error
        }
    },

    updateSpace: async (spaceId, updates) => {
        set({ loading: true, error: null })
        try {
            const updatedSpace = await spacesService.updateSpace(spaceId, updates)
            set((state) => ({
                spaces: state.spaces.map((s) =>
                    s.id === spaceId ? updatedSpace : s
                ),
                loading: false
            }))
        } catch (error) {
            console.error('Error updating space:', error)
            set({ error: 'Failed to update space', loading: false })
            throw error
        }
    },

    deleteSpace: async (spaceId) => {
        set({ loading: true, error: null })
        try {
            await spacesService.deleteSpace(spaceId)
            set((state) => ({
                spaces: state.spaces.filter((s) => s.id !== spaceId),
                loading: false
            }))
        } catch (error) {
            console.error('Error deleting space:', error)
            set({ error: 'Failed to delete space', loading: false })
            throw error
        }
    },

    toggleSpaceActive: async (spaceId) => {
        const space = get().spaces.find((s) => s.id === spaceId)
        if (!space) return

        set({ loading: true, error: null })
        try {
            const updatedSpace = await spacesService.toggleSpaceActive(spaceId, space.isActive)
            set((state) => ({
                spaces: state.spaces.map((s) =>
                    s.id === spaceId ? updatedSpace : s
                ),
                loading: false
            }))
        } catch (error) {
            console.error('Error toggling space active status:', error)
            set({ error: 'Failed to toggle space status', loading: false })
            throw error
        }
    }
}))

