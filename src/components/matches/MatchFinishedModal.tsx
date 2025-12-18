import { RotateCcw, Home, BarChart2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface MatchFinishedModalProps {
    isOpen: boolean
    matchId?: string
    matchInfo: {
        homeTeamName: string
        awayTeamName: string
        sets: any[]
        homeSetsWon: number
        awaySetsWon: number
        date?: string
        time?: string
        competition?: string
        stats?: any
    }
    onGoToAnalysis: () => void
    onGoToMenu: () => void
    onUndoMatchEnd: () => void
}

export function MatchFinishedModal({
    isOpen,
    matchId: _matchId,
    matchInfo,
    onGoToAnalysis,
    onGoToMenu,
    onUndoMatchEnd
}: MatchFinishedModalProps) {
    if (!isOpen) return null

    const lastSet = matchInfo.sets[matchInfo.sets.length - 1] || { home: 0, away: 0 }

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
                            <span className="font-bold text-zinc-700 dark:text-zinc-300">{matchInfo.homeTeamName}</span>
                            <span className="text-2xl font-black">{matchInfo.homeSetsWon} - {matchInfo.awaySetsWon}</span>
                            <span className="font-bold text-zinc-700 dark:text-zinc-300">{matchInfo.awayTeamName}</span>
                        </div>
                        <div className="text-sm text-zinc-500 dark:text-zinc-500 font-mono">
                            Último set: {lastSet.home} - {lastSet.away}
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
                        icon={BarChart2}
                        onClick={onGoToAnalysis}
                    >
                        Ver Análisis
                    </Button>

                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            variant="outline"
                            className="w-full border-zinc-300 dark:border-zinc-700"
                            icon={RotateCcw}
                            onClick={onUndoMatchEnd}
                        >
                            Deshacer Fin
                        </Button>
                        <Button
                            variant="secondary"
                            className="w-full"
                            icon={Home}
                            onClick={onGoToMenu}
                        >
                            Ir al Menú
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
