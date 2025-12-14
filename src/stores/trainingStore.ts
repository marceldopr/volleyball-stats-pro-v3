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
}

export const useTrainingStore = create<TrainingStore>()(
    persist(
        (set) => ({
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

            clearAllSchedules: () => set({ schedules: [] })
        }),
        {
            name: 'training-storage'
        }
    )
)
