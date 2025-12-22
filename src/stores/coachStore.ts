import { create } from 'zustand'
import type { CoachDB, CoachWithTeams } from '@/types/Coach'
import { coachService } from '@/services/coachService'

interface CoachStore {
    coaches: CoachDB[]
    coachesWithTeams: CoachWithTeams[]
    loading: boolean
    error: string | null

    // Actions
    loadCoaches: (clubId: string) => Promise<void>
    loadCoachesWithTeams: (clubId: string, seasonId: string) => Promise<void>
    getCoachById: (coachId: string) => CoachDB | undefined
    refreshCoaches: (clubId: string) => Promise<void>
    clearCoaches: () => void
}

export const useCoachStore = create<CoachStore>((set, get) => ({
    coaches: [],
    coachesWithTeams: [],
    loading: false,
    error: null,

    loadCoaches: async (clubId: string) => {
        set({ loading: true, error: null })
        try {
            const coaches = await coachService.getCoachesByClub(clubId)
            set({ coaches, loading: false })
        } catch (error) {
            console.error('Error loading coaches:', error)
            set({ error: 'Error loading coaches', loading: false })
        }
    },

    loadCoachesWithTeams: async (clubId: string, seasonId: string) => {
        set({ loading: true, error: null })
        try {
            const coachesWithTeams = await coachService.getCoachesWithCurrentTeams(clubId, seasonId)
            set({ coachesWithTeams, loading: false })
        } catch (error) {
            console.error('Error loading coaches with teams:', error)
            set({ error: 'Error loading coaches with teams', loading: false })
        }
    },

    getCoachById: (coachId: string) => {
        return get().coaches.find(coach => coach.id === coachId)
    },

    refreshCoaches: async (clubId: string) => {
        await get().loadCoaches(clubId)
    },

    clearCoaches: () => {
        set({ coaches: [], coachesWithTeams: [], loading: false, error: null })
    }
}))
