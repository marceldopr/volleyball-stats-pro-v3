import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SeasonState {
    startWeek: string | null  // Format: "YYYY-W##" (ISO week)
    endWeek: string | null    // Format: "YYYY-W##" (ISO week)
    setSeasonRange: (startWeek: string, endWeek: string) => void
    clearSeasonRange: () => void
}

export const useSeasonStore = create<SeasonState>()(
    persist(
        (set) => ({
            startWeek: null,
            endWeek: null,

            setSeasonRange: (startWeek: string, endWeek: string) => {
                set({ startWeek, endWeek })
            },

            clearSeasonRange: () => {
                set({ startWeek: null, endWeek: null })
            }
        }),
        {
            name: 'season-storage' // localStorage key
        }
    )
)
