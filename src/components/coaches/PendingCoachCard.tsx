import { User, Check, X } from 'lucide-react'
import type { CoachDB } from '@/types/Coach'
import { Button } from '@/components/ui/Button'

interface PendingCoachCardProps {
    coach: CoachDB
    onApprove: () => void | Promise<void>
    onReject: () => void | Promise<void>
}

export function PendingCoachCard({ coach, onApprove, onReject }: PendingCoachCardProps) {
    const fullName = `${coach.first_name} ${coach.last_name}`

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-yellow-300 dark:border-yellow-700 shadow-sm overflow-hidden">
            {/* Header with Pending Badge */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 px-5 py-3 border-b border-yellow-200 dark:border-yellow-700/50">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-yellow-800 dark:text-yellow-300 uppercase tracking-wide">
                        ⏳ Pendiente de aprobación
                    </span>
                    <span className="text-xs text-yellow-700 dark:text-yellow-400">
                        Nuevo registro
                    </span>
                </div>
            </div>

            {/* Body */}
            <div className="p-5">
                <div className="flex items-start gap-3 mb-4">
                    <div className="mt-1 p-2 rounded-full bg-gray-100 dark:bg-gray-700/50">
                        <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                            {fullName}
                        </h3>
                        {coach.email && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {coach.email}
                            </p>
                        )}
                        {coach.phone && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {coach.phone}
                            </p>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <Button
                        variant="primary"
                        size="sm"
                        icon={Check}
                        onClick={onApprove}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                        Aprobar
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        icon={X}
                        onClick={onReject}
                        className="flex-1 bg-red-600 text-white hover:bg-red-700"
                    >
                        Rechazar
                    </Button>
                </div>

                {/* Info Box */}
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/30 rounded text-xs text-gray-600 dark:text-gray-400">
                    <p>
                        Este entrenador se ha registrado mediante un enlace de invitación.
                        Revisa sus datos antes de aprobar el acceso.
                    </p>
                </div>
            </div>
        </div>
    )
}
