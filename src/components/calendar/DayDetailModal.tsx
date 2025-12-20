
import { X, Calendar as CalendarIcon } from 'lucide-react'
import { CalendarEvent } from '@/services/calendarService'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { DayOperationalView } from './DayOperationalView'

interface DayDetailModalProps {
    isOpen: boolean
    onClose: () => void
    date: Date
    events: CalendarEvent[]
    spaces: { id: string, name: string }[]
}

export function DayDetailModal({ isOpen, onClose, date, events, spaces }: DayDetailModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-gray-900 w-full max-w-6xl max-h-[90vh] rounded-xl border border-gray-800 shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary-500/10 p-2 rounded-lg text-primary-400">
                            <CalendarIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white capitalize">
                                {format(date, 'EEEE d', { locale: es })}
                            </h2>
                            <p className="text-sm text-gray-400">
                                {format(date, 'MMMM yyyy', { locale: es })}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4">
                    <DayOperationalView
                        date={date}
                        events={events}
                        spaces={spaces}
                        className="min-w-[800px]"
                    />
                </div>
            </div>
        </div>
    )
}
