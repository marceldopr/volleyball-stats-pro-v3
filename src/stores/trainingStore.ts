import { create } from 'zustand'
import { TrainingSchedule } from '@/types/trainingScheduleTypes'
import { trainingScheduleService } from '@/services/trainingScheduleService'

interface TrainingStore {
    schedules: TrainingSchedule[]
    loading: boolean
    error: string | null
    loadSchedules: (clubId: string) => Promise<void>
    loadSchedulesBySeason: (seasonId: string) => Promise<void>
    addSchedule: (schedule: Omit<TrainingSchedule, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
    updateSchedule: (scheduleId: string, updates: Partial<TrainingSchedule>) => Promise<void>
    deleteSchedule: (scheduleId: string) => Promise<void>
    toggleScheduleActive: (scheduleId: string) => Promise<void>
    clearAllSchedules: () => void
    getSchedulesBySeason: (seasonId: string) => TrainingSchedule[]
    cloneSchedulesToSeason: (fromSeasonId: string, toSeasonId: string, clubId: string) => Promise<void>
}

export const useTrainingStore = create<TrainingStore>((set, get) => ({
    schedules: [],
    loading: false,
    error: null,

    loadSchedules: async (clubId: string) => {
        set({ loading: true, error: null })
        try {
            const schedules = await trainingScheduleService.getSchedulesByClubId(clubId)
            set({ schedules, loading: false })
        } catch (error) {
            console.error('Error loading schedules:', error)
            set({ error: 'Failed to load schedules', loading: false })
        }
    },

    loadSchedulesBySeason: async (seasonId: string) => {
        set({ loading: true, error: null })
        try {
            const schedules = await trainingScheduleService.getSchedulesBySeason(seasonId)
            set({ schedules, loading: false })
        } catch (error) {
            console.error('Error loading schedules by season:', error)
            set({ error: 'Failed to load schedules', loading: false })
        }
    },

    addSchedule: async (schedule) => {
        set({ loading: true, error: null })
        try {
            const newSchedule = await trainingScheduleService.createSchedule(schedule)
            set((state) => ({
                schedules: [...state.schedules, newSchedule],
                loading: false
            }))
        } catch (error) {
            console.error('Error adding schedule:', error)
            set({ error: 'Failed to add schedule', loading: false })
            throw error
        }
    },

    updateSchedule: async (scheduleId, updates) => {
        set({ loading: true, error: null })
        try {
            const updatedSchedule = await trainingScheduleService.updateSchedule(scheduleId, updates)
            set((state) => ({
                schedules: state.schedules.map((s) =>
                    s.id === scheduleId ? updatedSchedule : s
                ),
                loading: false
            }))
        } catch (error) {
            console.error('Error updating schedule:', error)
            set({ error: 'Failed to update schedule', loading: false })
            throw error
        }
    },

    deleteSchedule: async (scheduleId) => {
        set({ loading: true, error: null })
        try {
            await trainingScheduleService.deleteSchedule(scheduleId)
            set((state) => ({
                schedules: state.schedules.filter((s) => s.id !== scheduleId),
                loading: false
            }))
        } catch (error) {
            console.error('Error deleting schedule:', error)
            set({ error: 'Failed to delete schedule', loading: false })
            throw error
        }
    },

    toggleScheduleActive: async (scheduleId) => {
        const schedule = get().schedules.find((s) => s.id === scheduleId)
        if (!schedule) return

        set({ loading: true, error: null })
        try {
            const updatedSchedule = await trainingScheduleService.toggleScheduleActive(scheduleId, schedule.isActive)
            set((state) => ({
                schedules: state.schedules.map((s) =>
                    s.id === scheduleId ? updatedSchedule : s
                ),
                loading: false
            }))
        } catch (error) {
            console.error('Error toggling schedule active status:', error)
            set({ error: 'Failed to toggle schedule status', loading: false })
            throw error
        }
    },

    clearAllSchedules: () => set({ schedules: [] }),

    getSchedulesBySeason: (seasonId: string) => {
        return get().schedules.filter(s => s.seasonId === seasonId)
    },

    cloneSchedulesToSeason: async (fromSeasonId: string, toSeasonId: string, clubId: string) => {
        set({ loading: true, error: null })
        try {
            await trainingScheduleService.cloneSchedulesToSeason(fromSeasonId, toSeasonId, clubId)
            // Reload all schedules for this club to include the cloned ones
            const schedules = await trainingScheduleService.getSchedulesByClubId(clubId)
            set({ schedules, loading: false })
        } catch (error) {
            console.error('Error cloning schedules:', error)
            set({ error: 'Failed to clone schedules', loading: false })
            throw error
        }
    }
}))

