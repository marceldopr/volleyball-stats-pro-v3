import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { seasonService, SeasonDB } from '@/services/seasonService'
import { useAuthStore } from '@/stores/authStore'

interface SeasonCacheContextType {
    currentSeason: SeasonDB | null
    loading: boolean
    refresh: () => Promise<void>
}

const SeasonCacheContext = createContext<SeasonCacheContextType | null>(null)

export function SeasonCacheProvider({ children }: { children: ReactNode }) {
    const { profile } = useAuthStore()
    const [currentSeason, setCurrentSeason] = useState<SeasonDB | null>(null)
    const [loading, setLoading] = useState(true)

    const loadSeason = async () => {
        if (!profile?.club_id) return

        try {
            setLoading(true)
            const season = await seasonService.getCurrentSeasonByClub(profile.club_id)
            setCurrentSeason(season)
        } catch (error) {
            console.error('Error loading current season:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadSeason()
    }, [profile?.club_id])

    return (
        <SeasonCacheContext.Provider value={{ currentSeason, loading, refresh: loadSeason }}>
            {children}
        </SeasonCacheContext.Provider>
    )
}

export function useCurrentSeason() {
    const context = useContext(SeasonCacheContext)
    if (!context) {
        throw new Error('useCurrentSeason must be used within SeasonCacheProvider')
    }
    return context
}
