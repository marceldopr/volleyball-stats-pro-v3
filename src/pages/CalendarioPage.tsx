import { Calendar, AlertCircle, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { DayDetailModal } from '@/components/calendar/DayDetailModal'
import { DayOperationalView } from '@/components/calendar/DayOperationalView'
import { useSeasonStore } from '@/stores/seasonStore'
import { getWeekId, isWeekInRange } from '@/utils/weekUtils'
import { useCalendarEvents } from '@/hooks/useCalendarEvents'
import { CalendarEvent } from '@/services/calendarService'
import { useAuthStore } from '@/stores/authStore'
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole'
import { parseISO, isSameDay as isSameDayFn, format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '@/lib/supabaseClient'

type ViewMode = 'month' | 'week'

export function CalendarioPage() {
    const [viewMode, setViewMode] = useState<ViewMode>('month')
    const [currentDate, setCurrentDate] = useState(new Date())
    const {
        startWeek,
        endWeek,
        seasons,
        activeSeasonId,
        selectedSeasonId,
        setSelectedSeasonId,
        loadSeasons
    } = useSeasonStore()
    const { profile } = useAuthStore()
    const { isDT } = useCurrentUserRole()
    const [coachTeamId, setCoachTeamId] = useState<string | null>(null)
    const [spaces, setSpaces] = useState<{ id: string, name: string }[]>([])
    const [selectedDetailDay, setSelectedDetailDay] = useState<Date | null>(null) // V3: Modal State

    // Fetch coach's assigned team
    useEffect(() => {
        if (!isDT && profile?.id) {
            supabase
                .from('coach_team_assignments')
                .select('team_id')
                .eq('user_id', profile.id)
                .limit(1)
                .single()
                .then(({ data }) => {
                    if (data) {
                        setCoachTeamId(data.team_id)
                    }
                })
        }
    }, [isDT, profile?.id])

    // Fetch club spaces for DT view
    useEffect(() => {
        if (isDT && profile?.club_id) {
            supabase
                .from('spaces')
                .select('id, name')
                .eq('club_id', profile.club_id)
                .eq('is_active', true)
                .order('name')
                .then(({ data }) => {
                    if (data) {
                        setSpaces(data)
                    }
                })
        }
    }, [isDT, profile?.club_id])

    // Load seasons if not loaded (critical for direct navigation or refresh)
    useEffect(() => {
        if (profile?.club_id && seasons.length === 0) {
            loadSeasons(profile.club_id)
        }
    }, [profile?.club_id, seasons.length, loadSeasons])

    // Get selectable seasons (active + drafts)
    const selectableSeasons = seasons.filter(s => s.status === 'active' || s.status === 'draft')
    const currentSeasonId = selectedSeasonId || activeSeasonId

    // Use unified calendar events
    const { events, loadEvents } = useCalendarEvents({
        viewType: isDT ? 'club' : 'team',
        teamId: isDT ? undefined : (coachTeamId || undefined),
        clubId: profile?.club_id
    })

    // Load events when date range changes
    useEffect(() => {
        if (!profile?.club_id) {
            console.warn('[Calendar] No club_id in profile')
            return
        }

        if (!currentSeasonId) {
            console.warn('[Calendar] No season selected - skipping load')
            return
        }

        // FIXED: Expand range to cover full calendar grid (including gray days)
        const start = viewMode === 'month'
            ? startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 })
            : startOfWeek(currentDate, { weekStartsOn: 1 })

        const end = viewMode === 'month'
            ? endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
            : endOfWeek(currentDate, { weekStartsOn: 1 })

        loadEvents(start, end)
    }, [currentDate, viewMode, loadEvents, profile?.club_id, currentSeasonId])

    // Helper to get events for a specific date
    const getEventsForDate = (date: Date): CalendarEvent[] => {
        return events
            .filter(event => isSameDayFn(parseISO(event.startAt), date))
            .sort((a, b) => a.startAt.localeCompare(b.startAt))
    }

    // Get month/week info
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth() // 0-11

    // Month calculations
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const firstDayOfWeek = (firstDay.getDay() + 6) % 7 // 0=Mon, 6=Sun

    // Week calculations
    const getWeekStart = (date: Date) => {
        const d = new Date(date)
        const day = d.getDay()
        const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
        return new Date(d.setDate(diff))
    }

    const weekStart = getWeekStart(currentDate)
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(weekStart)
        date.setDate(weekStart.getDate() + i)
        return date
    })

    // Generate calendar grid for month view
    const generateCalendarDays = () => {
        const days = []

        // Previous month trailing days
        const prevMonthLastDay = new Date(year, month, 0).getDate()
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            days.push({
                day: prevMonthLastDay - i,
                isCurrentMonth: false,
                date: new Date(year, month - 1, prevMonthLastDay - i)
            })
        }

        // Current month days
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push({
                day: i,
                isCurrentMonth: true,
                date: new Date(year, month, i)
            })
        }

        // Next month leading days
        const remainingCells = 42 - days.length
        for (let i = 1; i <= remainingCells; i++) {
            days.push({
                day: i,
                isCurrentMonth: false,
                date: new Date(year, month + 1, i)
            })
        }

        return days
    }

    const calendarDays = generateCalendarDays()

    // Group days into weeks (rows of 7)
    const calendarWeeks = []
    for (let i = 0; i < calendarDays.length; i += 7) {
        calendarWeeks.push(calendarDays.slice(i, i + 7))
    }

    // Check if a date is today
    const isToday = (date: Date) => {
        const today = new Date()
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
    }

    // Navigation functions (same as before)
    const goToPrevious = () => {
        if (viewMode === 'month') {
            setCurrentDate(new Date(year, month - 1, 1))
        } else {
            const newDate = new Date(weekStart)
            newDate.setDate(weekStart.getDate() - 7)
            setCurrentDate(newDate)
        }
    }

    const goToNext = () => {
        if (viewMode === 'month') {
            setCurrentDate(new Date(year, month + 1, 1))
        } else {
            const newDate = new Date(weekStart)
            newDate.setDate(weekStart.getDate() + 7)
            setCurrentDate(newDate)
        }
    }

    const goToToday = () => {
        setCurrentDate(new Date())
    }

    // Format month/week title (kept same)
    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]

    const getTitle = () => {
        if (viewMode === 'month') {
            return `${monthNames[month]} ${year}`
        } else {
            const lastDay = weekDays[6]
            const startDay = weekStart.getDate()
            const endDay = lastDay.getDate()
            const startMonth = monthNames[weekStart.getMonth()].slice(0, 3)
            const endMonth = monthNames[lastDay.getMonth()].slice(0, 3)

            if (weekStart.getMonth() === lastDay.getMonth()) {
                return `${startDay}–${endDay} ${startMonth} ${year}`
            } else {
                return `${startDay} ${startMonth} – ${endDay} ${endMonth} ${year}`
            }
        }
    }

    return (
        <div className="min-h-screen bg-gray-950 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header (same) */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <Calendar className="w-8 h-8 text-primary-500" />
                        <h1 className="text-3xl font-bold text-white">Calendario</h1>
                    </div>
                    <p className="text-gray-400">
                        Agenda unificada con partidos, entrenamientos y horarios
                    </p>
                </div>

                {/* CSS Styles for event types */}
                <style>{`
                    .event {
                        @apply px-2 py-1 rounded border text-xs;
                    }
                    .event--match {
                        @apply bg-red-600/20 border-red-600/30 text-red-200;
                    }
                    .event--training {
                        @apply bg-green-600/20 border-green-600/30 text-green-200;
                    }
                    .event--schedule {
                        @apply bg-blue-600/20 border-blue-600/30 text-blue-200;
                    }
                `}</style>

                {/* Controls (same) */}
                <div className="bg-gray-900 rounded-lg p-6 mb-6">
                    <div className="flex flex-wrap gap-4 items-center justify-between">
                        {/* View Toggle */}
                        <div className="flex gap-2 bg-gray-800 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('month')}
                                className={`px-4 py-2 rounded-md font-medium transition-colors ${viewMode === 'month'
                                    ? 'bg-primary-600 text-white'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                Mes
                            </button>
                            <button
                                onClick={() => setViewMode('week')}
                                className={`px-4 py-2 rounded-md font-medium transition-colors ${viewMode === 'week'
                                    ? 'bg-primary-600 text-white'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                Semana
                            </button>
                        </div>

                        {/* Season Selector */}
                        {selectableSeasons.length > 0 && (
                            <select
                                value={currentSeasonId || ''}
                                onChange={(e) => setSelectedSeasonId(e.target.value || null)}
                                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                            >
                                {selectableSeasons.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} {s.status === 'active' ? '(activa)' : '(borrador)'}
                                    </option>
                                ))}
                            </select>
                        )}

                        {/* Navigation */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={goToPrevious}
                                className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>

                            <h2 className="text-2xl font-bold text-white min-w-[250px] text-center">
                                {getTitle()}
                            </h2>

                            <button
                                onClick={goToNext}
                                className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Today Button */}
                        <button
                            onClick={goToToday}
                            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
                        >
                            Hoy
                        </button>

                        {/* Season Badge - Week View */}
                        {viewMode === 'week' && startWeek && endWeek && (
                            <div className="flex items-center gap-2">
                                {isWeekInRange(getWeekId(weekStart), startWeek, endWeek) ? (
                                    <div className="flex items-center gap-1.5 bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg text-sm font-medium">
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>Temporada</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 bg-gray-700 text-gray-400 px-3 py-1.5 rounded-lg text-sm font-medium">
                                        <span>Fuera de temporada</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Calendar Grid */}
                {viewMode === 'month' ? (
                    <div className="bg-gray-900 rounded-lg overflow-hidden mb-6 border border-gray-800 flex flex-col">
                        {/* Calendar Grid Header - Mon-Sun */}
                        <div className="grid grid-cols-7 bg-gray-800 border-b border-gray-700">
                            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
                                <div key={day} className="text-center font-semibold text-gray-400 py-3 border-r border-gray-700 last:border-r-0">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Weeks - Row by Row */}
                        <div className="flex flex-col">
                            {calendarWeeks.map((week, weekIndex) => {
                                const monday = week[0].date
                                const weekId = getWeekId(monday)
                                const isInSeason = isWeekInRange(weekId, startWeek, endWeek)

                                return (
                                    <div key={weekIndex} className="grid grid-cols-7 border-b border-gray-800 last:border-b-0">
                                        {week.map((dayInfo, dayIndex) => {
                                            const today = isToday(dayInfo.date)
                                            const globalIndex = weekIndex * 7 + dayIndex
                                            const dayEvents = getEventsForDate(dayInfo.date)

                                            // Count Types
                                            const matchCount = dayEvents.filter(e => e.type === 'match').length
                                            const trainingCount = dayEvents.filter(e => e.type === 'training' || e.type === 'schedule').length

                                            return (
                                                <div
                                                    key={globalIndex}
                                                    onClick={() => {
                                                        if (dayEvents.length > 0) {
                                                            setSelectedDetailDay(dayInfo.date)
                                                        }
                                                    }}
                                                    className={`
                                                        relative min-h-[100px] border-r border-gray-800 last:border-r-0 p-2
                                                        ${!dayInfo.isCurrentMonth ? 'bg-gray-950/50' : 'bg-gray-900'}
                                                        ${isInSeason && !today ? 'bg-blue-500/5' : ''}
                                                        ${today ? 'bg-primary-900/10' : ''}
                                                        ${dayEvents.length > 0 ? 'cursor-pointer hover:bg-gray-800 transition-colors' : ''}
                                                    `}
                                                >
                                                    {/* Day Header */}
                                                    <div className={`
                                                        text-sm font-medium mb-2 flex justify-between items-center
                                                        ${!dayInfo.isCurrentMonth ? 'text-gray-700' : 'text-gray-300'}
                                                        ${today ? 'text-primary-400 font-bold' : ''}
                                                    `}>
                                                        <span>{dayInfo.day}</span>
                                                    </div>

                                                    {/* Summary Counters */}
                                                    <div className="flex flex-col gap-1.5">
                                                        {matchCount > 0 && (
                                                            <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded text-xs text-red-300 font-medium">
                                                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                                                <span>{matchCount} Partidos</span>
                                                            </div>
                                                        )}
                                                        {trainingCount > 0 && (
                                                            <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded text-xs text-blue-300 font-medium">
                                                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                                                <span>{trainingCount} Entrenos</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 mb-6">
                        {weekDays.map((date, i) => {
                            const today = isToday(date)
                            const dayEvents = getEventsForDate(date)

                            return (
                                <div key={i} className={`rounded-lg border overflow-hidden ${today ? 'border-primary-500/30' : 'border-gray-800'}`}>
                                    {/* Day Header */}
                                    <div className={`
                                        px-4 py-3 flex items-center justify-between
                                        ${today ? 'bg-primary-900/10' : 'bg-gray-900'}
                                        border-b border-gray-800
                                     `}>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-lg font-bold capitalize ${today ? 'text-primary-400' : 'text-white'}`}>
                                                {format(date, 'EEEE d', { locale: es })}
                                            </span>
                                            {today && (
                                                <span className="text-xs font-medium bg-primary-500/20 text-primary-300 px-2 py-0.5 rounded-full">
                                                    Hoy
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {dayEvents.length} eventos
                                        </div>
                                    </div>

                                    {/* Operational View */}
                                    <div className="bg-gray-900/50 p-4">
                                        <DayOperationalView
                                            date={date}
                                            events={dayEvents}
                                            spaces={spaces}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* CTA */}
                <div className="flex justify-center">
                    <button
                        disabled
                        className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium opacity-50 cursor-not-allowed flex items-center gap-2"
                    >
                        <Calendar className="w-5 h-5" />
                        Crear evento
                        <span className="bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded text-xs ml-2">
                            Pronto
                        </span>
                    </button>
                </div>

                {/* Info Message */}
                <div className="mt-8 bg-gray-900 border border-gray-800 rounded-lg p-6">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-semibold text-white mb-1">
                                Funcionalidad en desarrollo
                            </h4>
                            <p className="text-gray-400 text-sm">
                                El calendario estará disponible próximamente para planificar y visualizar
                                todos los eventos del club.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            {/* Day Detail Modal */}
            {selectedDetailDay && (
                <DayDetailModal
                    isOpen={!!selectedDetailDay}
                    onClose={() => setSelectedDetailDay(null)}
                    date={selectedDetailDay}
                    events={getEventsForDate(selectedDetailDay)}
                    spaces={spaces}
                />
            )}
        </div>
    )
}
