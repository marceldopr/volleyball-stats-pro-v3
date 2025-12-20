
import { CalendarEvent } from '@/services/calendarService'
import { CompactEventItem } from './CompactEventItem'

interface DayOperationalViewProps {
    date: Date
    events: CalendarEvent[]
    spaces: { id: string, name: string }[]
    className?: string
}

export function DayOperationalView({ events, spaces, className = '' }: DayOperationalViewProps) {
    // Time Slot Logic
    const uniqueTimes = Array.from(new Set(events.map(e => e.startAt)))
        .sort((a, b) => a.localeCompare(b))

    const hasUnassigned = events.some(e => {
        const loc = (e.location || '').trim().toLowerCase()
        const pref = (e.preferredSpace || '').trim().toLowerCase()
        return !spaces.some(s => {
            const sName = s.name.trim().toLowerCase()
            return loc === sName || pref === sName
        })
    })

    const totalCols = spaces.length + (hasUnassigned ? 1 : 0)

    if (events.length === 0) {
        return (
            <div className={`flex flex-col items-center justify-center p-8 text-gray-500 bg-gray-900/30 rounded-lg border border-gray-800/50 ${className}`}>
                <p className="text-sm">Sin eventos programados</p>
            </div>
        )
    }

    return (
        <div className={`bg-gray-900/50 rounded-lg border border-gray-800/50 overflow-hidden ${className}`}>
            <div className="min-w-full overflow-x-auto">
                <div className="min-w-[600px]"> {/* Ensure minimum width for readability */}
                    {/* Spaces Header */}
                    <div className="grid border-b border-gray-700/50 py-2 bg-gray-800/20" style={{ gridTemplateColumns: `repeat(${totalCols}, 1fr)` }}>
                        {spaces.map(s => (
                            <div key={s.id} className="text-xs font-semibold text-gray-400 text-center truncate px-2 border-r border-gray-800/30 last:border-r-0">
                                {s.name}
                            </div>
                        ))}
                        {hasUnassigned && (
                            <div className="text-xs font-semibold text-gray-500 text-center truncate px-2 bg-gray-800/20 rounded mx-1">
                                Sin Asignar
                            </div>
                        )}
                    </div>

                    {/* Timeline Grid */}
                    <div className="flex flex-col">
                        {uniqueTimes.map(time => {
                            const slotEvents = events.filter(e => e.startAt === time)

                            return (
                                <div key={time} className="grid min-h-[40px] border-b border-gray-800/30 hover:bg-gray-800/20 transition-colors" style={{ gridTemplateColumns: `repeat(${totalCols}, 1fr)` }}>
                                    {/* Spaces Items */}
                                    {spaces.map(space => {
                                        const cellEvents = slotEvents.filter(e => {
                                            const loc = (e.location || '').trim().toLowerCase()
                                            const pref = (e.preferredSpace || '').trim().toLowerCase()
                                            const sName = space.name.trim().toLowerCase()
                                            return loc === sName || pref === sName
                                        })

                                        return (
                                            <div key={`${time}-${space.id}`} className="px-1 py-1 border-r border-gray-800/30 last:border-r-0 flex flex-col justify-start">
                                                {cellEvents.map(event => (
                                                    <div key={event.id} className="mb-0.5 last:mb-0">
                                                        <CompactEventItem event={event} />
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    })}

                                    {/* Unassigned Items */}
                                    {hasUnassigned && (
                                        <div className="px-1 py-1 bg-gray-800/10 flex flex-col justify-start">
                                            {slotEvents.filter(e => {
                                                const loc = (e.location || '').trim().toLowerCase()
                                                const pref = (e.preferredSpace || '').trim().toLowerCase()
                                                return !spaces.some(s => {
                                                    const sName = s.name.trim().toLowerCase()
                                                    return loc === sName || pref === sName
                                                })
                                            }).map(event => (
                                                <div key={event.id} className="mb-0.5 last:mb-0">
                                                    <CompactEventItem event={event} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
