import { Calendar, AlertCircle, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { useSeasonStore } from '@/stores/seasonStore'
import { getWeekId, isWeekInRange } from '@/utils/weekUtils'

type ViewMode = 'month' | 'week'

export function CalendarioPage() {
    const [viewMode, setViewMode] = useState<ViewMode>('month')
    const [currentDate, setCurrentDate] = useState(new Date())
    const { startWeek, endWeek } = useSeasonStore()

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

    // Navigation functions
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

    // Format month/week title
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
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <Calendar className="w-8 h-8 text-primary-500" />
                        <h1 className="text-3xl font-bold text-white">Calendario</h1>
                        <span className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-sm font-medium">
                            Pronto
                        </span>
                    </div>
                    <p className="text-gray-400">
                        Planifica reuniones, entrenamientos y partidos.
                    </p>
                </div>

                {/* Controls */}
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

                    {/* Filters */}
                    <div className="flex flex-wrap gap-2 mt-4">
                        <select disabled className="px-4 py-2 bg-gray-800 text-gray-400 rounded-lg border border-gray-700 opacity-50 cursor-not-allowed">
                            <option>Equipo</option>
                        </select>
                        <select disabled className="px-4 py-2 bg-gray-800 text-gray-400 rounded-lg border border-gray-700 opacity-50 cursor-not-allowed">
                            <option>Tipo</option>
                        </select>
                        <select disabled className="px-4 py-2 bg-gray-800 text-gray-400 rounded-lg border border-gray-700 opacity-50 cursor-not-allowed">
                            <option>Todos los espacios</option>
                            <option>Pista 1</option>
                            <option>Pista 2</option>
                            <option>Gimnasio</option>
                            <option>Patio exterior</option>
                        </select>
                        <button
                            disabled
                            className="px-4 py-2 bg-gray-800 text-gray-400 rounded-lg border border-gray-700 opacity-50 cursor-not-allowed flex items-center gap-2"
                        >
                            Vista por espacio
                            <span className="bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded text-xs">
                                Pronto
                            </span>
                        </button>
                    </div>
                </div>

                {/* Calendar Grid */}
                {viewMode === 'month' ? (
                    <div className="bg-gray-900 rounded-lg overflow-hidden mb-6 border border-gray-800">
                        {/* Day Headers */}
                        <div className="grid grid-cols-7 bg-gray-800">
                            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
                                <div key={day} className="text-center font-semibold text-gray-400 py-3 border-r border-gray-700 last:border-r-0">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Weeks - Row by Row */}
                        <div>
                            {calendarWeeks.map((week, weekIndex) => {
                                // Get Monday of this week (first day)
                                const monday = week[0].date
                                const weekId = getWeekId(monday)
                                const isInSeason = isWeekInRange(weekId, startWeek, endWeek)

                                return (
                                    <div key={weekIndex} className="grid grid-cols-7">
                                        {week.map((dayInfo, dayIndex) => {
                                            const today = isToday(dayInfo.date)
                                            const globalIndex = weekIndex * 7 + dayIndex

                                            return (
                                                <div
                                                    key={globalIndex}
                                                    className={`
                            relative min-h-[80px] p-2 border-r border-b border-gray-800
                            ${dayIndex === 6 ? 'border-r-0' : ''}
                            ${weekIndex === 5 ? 'border-b-0' : ''}
                            ${!dayInfo.isCurrentMonth ? 'bg-gray-950' : 'bg-gray-900'}
                            ${isInSeason && !today ? 'bg-blue-500/5' : ''}
                            ${today ? 'bg-primary-900/20' : ''}
                            hover:bg-gray-800 cursor-pointer transition-colors
                          `}
                                                >
                                                    <div className={`
                            text-sm font-medium
                            ${!dayInfo.isCurrentMonth ? 'text-gray-700' : 'text-gray-300'}
                            ${today ? 'text-primary-400 font-bold' : ''}
                          `}>
                                                        {dayInfo.day}
                                                    </div>
                                                    {/* Future: Events will go here */}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="bg-gray-900 rounded-lg overflow-hidden mb-6 border border-gray-800">
                        {/* Week Headers */}
                        <div className="grid grid-cols-7 bg-gray-800">
                            {weekDays.map((date, i) => {
                                const today = isToday(date)
                                return (
                                    <div key={i} className="text-center py-4 border-r border-gray-700 last:border-r-0">
                                        <div className="text-xs font-semibold text-gray-400 mb-1">
                                            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][i]}
                                        </div>
                                        <div className={`text-lg font-bold ${today ? 'text-primary-400' : 'text-white'}`}>
                                            {date.getDate()}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Week Day Columns */}
                        <div className="grid grid-cols-7" style={{ minHeight: '500px' }}>
                            {weekDays.map((date, i) => {
                                const today = isToday(date)
                                return (
                                    <div
                                        key={i}
                                        className={`
                      border-r border-gray-800 last:border-r-0 p-2
                      ${today ? 'bg-primary-900/10' : 'bg-gray-900'}
                      hover:bg-gray-800 cursor-pointer transition-colors
                    `}
                                    >
                                        {/* Future: Events will go here */}
                                    </div>
                                )
                            })}
                        </div>
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
        </div>
    )
}
