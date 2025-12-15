import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SeasonDB, seasonService } from '@/services/seasonService'

interface SeasonState {
    // Calendar highlighting (existing)
    startWeek: string | null  // Format: "YYYY-W##" (ISO week)
    endWeek: string | null    // Format: "YYYY-W##" (ISO week)

    // Multi-season management (new)
    seasons: SeasonDB[]
    activeSeasonId: string | null
    selectedSeasonId: string | null // For calendar/settings views
    loading: boolean

    // Actions (existing)
    setSeasonRange: (startWeek: string, endWeek: string) => void
    clearSeasonRange: () => void

    // Actions (new)
    loadSeasons: (clubId: string) => Promise<void>
    setActiveSeasonId: (seasonId: string | null) => void
    setSelectedSeasonId: (seasonId: string | null) => void
    getActiveSeasonName: () => string | null
}

export const useSeasonStore = create<SeasonState>()(
    persist(
        (set, get) => ({
            // Existing state
            startWeek: null,
            endWeek: null,

            // New state
            seasons: [],
            activeSeasonId: null,
            selectedSeasonId: null,
            loading: false,

            // Existing actions
            setSeasonRange: (startWeek: string, endWeek: string) => {
                set({ startWeek, endWeek })
            },

            clearSeasonRange: () => {
                set({ startWeek: null, endWeek: null })
            },

            // New actions
            loadSeasons: async (clubId: string) => {
                set({ loading: true })
                try {
                    const seasons = await seasonService.getSeasonsByClub(clubId)
                    const activeSeason = seasons.find(s => s.status === 'active')

                    set({
                        seasons,
                        activeSeasonId: activeSeason?.id || null,
                        selectedSeasonId: activeSeason?.id || null,
                        loading: false
                    })

                    // Also set week range from active season if available
                    if (activeSeason?.start_date && activeSeason?.end_date) {
                        // Convert dates to week format if needed
                        // For now, keep existing behavior
                    }
                } catch (error) {
                    console.error('Error loading seasons:', error)
                    set({ loading: false })
                }
            },

            setActiveSeasonId: (seasonId: string | null) => {
                set({ activeSeasonId: seasonId, selectedSeasonId: seasonId })
            },

            setSelectedSeasonId: (seasonId: string | null) => {
                set({ selectedSeasonId: seasonId })
            },

            getActiveSeasonName: () => {
                const { seasons, activeSeasonId } = get()
                const activeSeason = seasons.find(s => s.id === activeSeasonId)
                return activeSeason?.name || null
            }
        }),
        {
            name: 'season-storage', // localStorage key
            partialize: (state) => ({
                startWeek: state.startWeek,
                endWeek: state.endWeek,
                activeSeasonId: state.activeSeasonId,
                selectedSeasonId: state.selectedSeasonId
            })
        }
    )
)
