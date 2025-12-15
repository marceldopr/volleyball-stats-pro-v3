import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { TrainingSchedule } from '@/types/trainingScheduleTypes'

interface TrainingStore {
    schedules: TrainingSchedule[]
    addSchedule: (schedule: TrainingSchedule) => void
    updateSchedule: (scheduleId: string, updates: Partial<TrainingSchedule>) => void
    deleteSchedule: (scheduleId: string) => void
    toggleScheduleActive: (scheduleId: string) => void
    clearAllSchedules: () => void
    getSchedulesBySeason: (seasonId: string) => TrainingSchedule[]
    cloneSchedulesToSeason: (fromSeasonId: string, toSeasonId: string) => void
}

export const useTrainingStore = create<TrainingStore>()(
    persist(
        (set, get) => ({
            schedules: [],

            addSchedule: (schedule) =>
                set((state) => ({ schedules: [...state.schedules, schedule] })),

            updateSchedule: (scheduleId, updates) =>
                set((state) => ({
                    schedules: state.schedules.map((s) =>
                        s.id === scheduleId ? { ...s, ...updates } : s
                    )
                })),

            deleteSchedule: (scheduleId) =>
                set((state) => ({
                    schedules: state.schedules.filter((s) => s.id !== scheduleId)
                })),

            toggleScheduleActive: (scheduleId) =>
                set((state) => ({
                    schedules: state.schedules.map((s) =>
                        s.id === scheduleId ? { ...s, isActive: !s.isActive } : s
                    )
                })),

            clearAllSchedules: () => set({ schedules: [] }),

            getSchedulesBySeason: (seasonId: string) => {
                return get().schedules.filter(s => s.seasonId === seasonId)
            },

            cloneSchedulesToSeason: (fromSeasonId: string, toSeasonId: string) => {
                const { schedules } = get()
                const sourceSchedules = schedules.filter(s => s.seasonId === fromSeasonId)

                const clonedSchedules = sourceSchedules.map(schedule => ({
                    ...schedule,
                    id: `${schedule.id}-clone-${Date.now()}`,
                    seasonId: toSeasonId
                }))

                set((state) => ({
                    schedules: [...state.schedules, ...clonedSchedules]
                }))
            }
        }),
        {
            name: 'training-storage'
        }
    )
)
