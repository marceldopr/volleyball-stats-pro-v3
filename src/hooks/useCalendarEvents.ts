import { useState, useCallback } from 'react'
import { calendarService, CalendarEvent } from '@/services/calendarService'
import { useSeasonStore } from '@/stores/seasonStore'

interface UseCalendarEventsOptions {
    viewType: 'team' | 'club'
    teamId?: string
    clubId?: string
}

export function useCalendarEvents({ viewType, teamId, clubId }: UseCalendarEventsOptions) {
    const [events, setEvents] = useState<CalendarEvent[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const { activeSeasonId, selectedSeasonId } = useSeasonStore()
    const currentSeasonId = selectedSeasonId || activeSeasonId

    const loadEvents = useCallback(async (startDate: Date, endDate: Date) => {
        if (!currentSeasonId) {
            setEvents([])
            return
        }

        setLoading(true)
        setError(null)

        try {
            let fetchedEvents: CalendarEvent[] = []

            if (viewType === 'team' && teamId) {
                fetchedEvents = await calendarService.getTeamEvents(
                    teamId,
                    currentSeasonId,
                    startDate,
                    endDate
                )
            } else if (viewType === 'club' && clubId) {
                fetchedEvents = await calendarService.getClubEvents(
                    clubId,
                    currentSeasonId,
                    startDate,
                    endDate
                )
            }

            setEvents(fetchedEvents)
        } catch (err) {
            console.error('Error loading calendar events:', err)
            setError(err instanceof Error ? err.message : 'Failed to load events')
            setEvents([])
        } finally {
            setLoading(false)
        }
    }, [viewType, teamId, clubId, currentSeasonId])

    return {
        events,
        loading,
        error,
        loadEvents
    }
}
