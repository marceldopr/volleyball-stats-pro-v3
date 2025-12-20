import { format, parseISO } from 'date-fns'
import { CalendarEvent } from '@/services/calendarService'

export function CompactEventItem({ event }: { event: CalendarEvent }) {
    const getBgColor = (type: string) => {
        switch (type) {
            case 'match': return 'bg-red-500/20 text-red-300 border-red-500/30'
            case 'training': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
            case 'schedule': return 'bg-blue-500/10 text-blue-400/70 border-blue-500/20 border-dashed'
            default: return 'bg-gray-700 text-gray-300'
        }
    }

    return (
        <div
            className={`
                px-1 py-0.5 rounded border text-[10px] leading-tight truncate cursor-pointer
                hover:opacity-80 transition-opacity
                ${getBgColor(event.type)}
            `}
            title={`${event.title} (${event.teamName}) - ${format(parseISO(event.startAt), 'HH:mm')}`}
        >
            <span className="font-mono opacity-75 mr-1">{format(parseISO(event.startAt), 'HH:mm')}</span>
            <span className="font-medium">{event.teamName}</span>
        </div>
    )
}
