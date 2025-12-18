
import { Check, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SetSummary } from '@/stores/matchStore'

interface SetSummaryModalV2Props {
    isOpen: boolean
    summary: SetSummary | undefined
    homeTeamName: string
    awayTeamName: string
    onConfirm: () => void
    onUndo: () => void
    onClose: () => void
}

export function SetSummaryModal({
    isOpen,
    summary,
    homeTeamName,
    awayTeamName,
    onConfirm,
    onUndo,
    onClose
}: SetSummaryModalV2Props) {
    if (!isOpen || !summary) return null

    // Determine Set Winner Color
    const homeWon = summary.homeScore > summary.awayScore

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-lg p-6 border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                        Set {summary.setNumber} Finalizado
                    </h2>
                    <p className="text-zinc-600 dark:text-zinc-400">
                        Resumen del set
                    </p>
                </div>

                {/* Score Board */}
                <div className="p-4 mb-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                    <div className="flex justify-between items-center">
                        <div className={`text-lg font-bold ${homeWon ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                            {homeTeamName}
                        </div>
                        <div className="text-3xl font-black mx-4">
                            {summary.homeScore} - {summary.awayScore}
                        </div>
                        <div className={`text-lg font-bold ${!homeWon ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                            {awayTeamName}
                        </div>
                    </div>
                    <div className="text-center mt-2 text-sm text-zinc-500">
                        Sets: {summary.setsWonHome} - {summary.setsWonAway}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="flex-1 mb-6">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3 uppercase tracking-wider text-center">
                        Estadísticas del Set
                    </h3>

                    <div className="grid grid-cols-3 gap-y-2 text-sm">
                        {/* Headers */}
                        <div className="text-center font-bold text-zinc-500 pb-2 border-b dark:border-zinc-700">{homeTeamName}</div>
                        <div className="text-center font-bold text-zinc-500 pb-2 border-b dark:border-zinc-700">Concepto</div>
                        <div className="text-center font-bold text-zinc-500 pb-2 border-b dark:border-zinc-700">{awayTeamName}</div>

                        {/* Aces */}
                        <div className="text-center py-2 font-mono">{summary.pointsByType.home.serve}</div>
                        <div className="text-center py-2 text-zinc-600 dark:text-zinc-400">Aces</div>
                        <div className="text-center py-2 font-mono">{summary.pointsByType.away.serve}</div>

                        {/* Attacks */}
                        <div className="text-center py-2 font-mono bg-zinc-50 dark:bg-zinc-800/50">{summary.pointsByType.home.attack}</div>
                        <div className="text-center py-2 text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50">Ataque</div>
                        <div className="text-center py-2 font-mono bg-zinc-50 dark:bg-zinc-800/50">{summary.pointsByType.away.attack}</div>

                        {/* Blocks */}
                        <div className="text-center py-2 font-mono">{summary.pointsByType.home.block}</div>
                        <div className="text-center py-2 text-zinc-600 dark:text-zinc-400">Bloqueo</div>
                        <div className="text-center py-2 font-mono">{summary.pointsByType.away.block}</div>

                        {/* Opp Errors */}
                        <div className="text-center py-2 font-mono bg-zinc-50 dark:bg-zinc-800/50">{summary.pointsByType.home.opponentError}</div>
                        <div className="text-center py-2 text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50">Error Rival</div>
                        <div className="text-center py-2 font-mono bg-zinc-50 dark:bg-zinc-800/50">{summary.pointsByType.away.opponentError}</div>

                        {/* Max Run */}
                        <div className="text-center py-2 font-mono font-bold text-emerald-600">{summary.maxRunHome}</div>
                        <div className="text-center py-2 text-zinc-600 dark:text-zinc-400 font-bold">Max Racha</div>
                        <div className="text-center py-2 font-mono font-bold text-emerald-600">{summary.maxRunAway}</div>
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-3 mt-auto">
                    <Button
                        variant="primary"
                        size="lg"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        icon={Check}
                        onClick={onConfirm}
                    >
                        Confirmar y Continuar
                    </Button>

                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            variant="danger"
                            className="w-full"
                            icon={RotateCcw}
                            onClick={onUndo}
                        >
                            Deshacer pto.
                        </Button>
                        <Button
                            variant="secondary"
                            className="w-full"
                            icon={X}
                            onClick={onClose}
                        >
                            Cerrar
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
