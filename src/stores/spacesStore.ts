import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Space } from '@/types/spacesTypes'

interface SpacesStore {
    spaces: Space[]
    addSpace: (space: Space) => void
    updateSpace: (spaceId: string, updates: Partial<Space>) => void
    deleteSpace: (spaceId: string) => void
    toggleSpaceActive: (spaceId: string) => void
}

export const useSpacesStore = create<SpacesStore>()(
    persist(
        (set) => ({
            spaces: [],

            addSpace: (space) =>
                set((state) => ({ spaces: [...state.spaces, space] })),

            updateSpace: (spaceId, updates) =>
                set((state) => ({
                    spaces: state.spaces.map((s) =>
                        s.id === spaceId ? { ...s, ...updates } : s
                    )
                })),

            deleteSpace: (spaceId) =>
                set((state) => ({
                    spaces: state.spaces.filter((s) => s.id !== spaceId)
                })),

            toggleSpaceActive: (spaceId) =>
                set((state) => ({
                    spaces: state.spaces.map((s) =>
                        s.id === spaceId ? { ...s, isActive: !s.isActive } : s
                    )
                }))
        }),
        {
            name: 'spaces-storage'
        }
    )
)
