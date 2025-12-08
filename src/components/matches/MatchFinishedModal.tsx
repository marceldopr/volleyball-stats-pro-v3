export interface MatchFinishedModalProps {
    isOpen: boolean
    onConfirm: () => void
    onUndo: () => void
    onViewReadOnly: () => void
    homeTeamName: string
    awayTeamName: string
    setsWonHome: number
    setsWonAway: number
    finalSetScore: { home: number; away: number }
}

import { Check, RotateCcw, Eye } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function MatchFinishedModal({
    isOpen,
    onConfirm,
    onUndo,
    onViewReadOnly,
    homeTeamName,
    awayTeamName,
    setsWonHome,
    setsWonAway,
    finalSetScore
}: MatchFinishedModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md p-6 border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                        🎉 Partido Finalizado
                    </h2>
                    <p className="text-zinc-600 dark:text-zinc-400">
                        El partido ha terminado con el resultado:
                    </p>

                    <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-zinc-700 dark:text-zinc-300">{homeTeamName}</span>
                            <span className="text-2xl font-black">{setsWonHome} - {setsWonAway}</span>
                            <span className="font-bold text-zinc-700 dark:text-zinc-300">{awayTeamName}</span>
                        </div>
                        <div className="text-sm text-zinc-500 dark:text-zinc-500 font-mono">
                            Último set: {finalSetScore.home} - {finalSetScore.away}
                        </div>
                    </div>

                    <p className="mt-4 text-sm text-zinc-500">
                        Ya no se pueden añadir más acciones.
                        <br />
                        ¿Qué deseas hacer ahora?
                    </p>
                </div>

                <div className="space-y-3">
                    <Button
                        variant="primary"
                        size="lg"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        icon={Check}
                        onClick={onConfirm}
                    >
                        Confirmar y Finalizar
                    </Button>

                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            variant="outline"
                            className="w-full border-zinc-300 dark:border-zinc-700"
                            icon={RotateCcw}
                            onClick={onUndo}
                        >
                            Deshacer último
                        </Button>
                        <Button
                            variant="secondary"
                            className="w-full"
                            icon={Eye}
                            onClick={onViewReadOnly}
                        >
                            Ver partido
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
