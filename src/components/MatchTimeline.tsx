import { TimelineEntry } from '@/utils/timelineFormatter'

interface MatchTimelineV2Props {
    events: TimelineEntry[]
    className?: string
}

export function MatchTimeline({ events, className = '' }: MatchTimelineV2Props) {
    // Reverse to show most recent first
    const reversedEvents = [...events].reverse()

    if (events.length === 0) {
        return (
            <div className={`bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 ${className}`}>
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">📋</span>
                    <h3 className="text-sm font-semibold text-zinc-300">Historial del Partido</h3>
                </div>
                <p className="text-xs text-zinc-500 text-center py-4">
                    No hay eventos aún
                </p>
            </div>
        )
    }

    return (
        <div className={`bg-zinc-900/50 border border-zinc-800 rounded-lg ${className}`}>
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
                <span className="text-lg">📋</span>
                <h3 className="text-sm font-semibold text-zinc-300">Historial del Partido</h3>
                <span className="ml-auto text-xs text-zinc-500">{events.length} eventos</span>
            </div>

            {/* Timeline List */}
            <div className="max-h-64 overflow-y-auto">
                {reversedEvents.map((entry, index) => (
                    <TimelineRow
                        key={entry.id}
                        entry={entry}
                        isLast={index === reversedEvents.length - 1}
                    />
                ))}
            </div>
        </div>
    )
}

interface TimelineRowProps {
    entry: TimelineEntry
    isLast: boolean
}

function TimelineRow({ entry, isLast }: TimelineRowProps) {
    // Color coding based on team
    const teamColor = entry.team === 'us'
        ? 'text-emerald-400 bg-emerald-950/30'
        : entry.team === 'opponent'
            ? 'text-rose-400 bg-rose-950/30'
            : 'text-zinc-400 bg-zinc-900/30'

    const borderColor = entry.team === 'us'
        ? 'border-emerald-800/30'
        : entry.team === 'opponent'
            ? 'border-rose-800/30'
            : 'border-zinc-800/30'

    return (
        <div
            data-testid="timeline-entry"
            className={`
                px-4 py-2.5 
                border-l-2 ${borderColor}
                ${!isLast ? 'border-b border-zinc-800/50' : ''}
                hover:bg-zinc-800/30 transition-colors
            `}
        >
            <div className="flex items-start gap-2">
                {/* Icon */}
                <span className="text-base mt-0.5 flex-shrink-0">
                    {entry.icon}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* First line: Set + Team + Description */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Set badge */}
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-400">
                            Set {entry.setNumber}
                        </span>

                        {/* Team label (if applicable) */}
                        {entry.teamLabel && (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${teamColor}`}>
                                {entry.teamLabel}
                            </span>
                        )}

                        {/* Description */}
                        <span className="text-xs text-zinc-300 flex-1">
                            {entry.description}
                        </span>
                    </div>

                    {/* Second line: Score (if available) */}
                    {entry.score && (
                        <div className="mt-0.5">
                            <span className="text-[11px] font-mono text-zinc-500">
                                {entry.score.home}-{entry.score.away}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
