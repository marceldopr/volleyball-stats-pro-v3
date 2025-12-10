import { Trophy, ArrowLeft, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface MatchFinishedModalV2Props {
    isOpen: boolean
    matchId?: string
    matchInfo: {
        homeTeamName: string
        awayTeamName: string
        sets: { setNumber: number; home: number; away: number }[]
        homeSetsWon: number
        awaySetsWon: number
        date?: string
        time?: string
        competition?: string
    }
    onGoToMatches: () => void
    onGoToAnalysis?: () => void
}

export function MatchFinishedModalV2({
    isOpen,
    matchInfo,
    onGoToMatches,
    onGoToAnalysis
}: MatchFinishedModalV2Props) {
    if (!isOpen) return null

    const { homeTeamName, awayTeamName, sets, homeSetsWon, awaySetsWon, date, time, competition } = matchInfo

    // Determine winner for styling
    const homeWon = homeSetsWon > awaySetsWon
    const awayWon = awaySetsWon > homeSetsWon

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-zinc-800 animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="relative p-6 border-b border-zinc-800">
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full">
                            <Trophy className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2">
                            Partido Finalizado
                        </h2>

                        {/* Match Info */}
                        {(date || time || competition) && (
                            <div className="flex items-center justify-center gap-3 text-sm text-zinc-400 mt-2">
                                {date && <span>{date}</span>}
                                {date && time && <span>·</span>}
                                {time && <span>{time}</span>}
                                {(date || time) && competition && <span>·</span>}
                                {competition && <span className="font-semibold text-zinc-300">{competition}</span>}
                            </div>
                        )}
                    </div>
                </div>

                {/* Result Summary */}
                <div className="p-6 bg-zinc-800/30">
                    <div className="flex items-center justify-between gap-4 mb-6">
                        <div className="flex-1 text-right">
                            <h3 className={`text-2xl font-bold truncate ${homeWon ? 'text-emerald-400' : 'text-zinc-300'}`}>
                                {homeTeamName}
                            </h3>
                        </div>

                        <div className="flex items-center gap-2 px-6 py-3 bg-zinc-900 rounded-xl border-2 border-zinc-700">
                            <span className={`text-4xl font-black ${homeWon ? 'text-emerald-400' : 'text-zinc-400'}`}>
                                {homeSetsWon}
                            </span>
                            <span className="text-2xl font-bold text-zinc-600">-</span>
                            <span className={`text-4xl font-black ${awayWon ? 'text-emerald-400' : 'text-zinc-400'}`}>
                                {awaySetsWon}
                            </span>
                        </div>

                        <div className="flex-1">
                            <h3 className={`text-2xl font-bold truncate ${awayWon ? 'text-emerald-400' : 'text-zinc-300'}`}>
                                {awayTeamName}
                            </h3>
                        </div>
                    </div>

                    {/* Sets Table */}
                    {sets.length > 0 && (
                        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-zinc-800">
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                            Set
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                            {homeTeamName}
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                            {awayTeamName}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                    {sets.map((set) => {
                                        const homeWonSet = set.home > set.away
                                        const awayWonSet = set.away > set.home

                                        return (
                                            <tr key={set.setNumber} className="hover:bg-zinc-800/30 transition-colors">
                                                <td className="px-4 py-3 text-sm font-medium text-zinc-300">
                                                    Set {set.setNumber}
                                                </td>
                                                <td className={`px-4 py-3 text-center text-lg font-bold ${homeWonSet ? 'text-emerald-400' : 'text-zinc-500'
                                                    }`}>
                                                    {set.home}
                                                </td>
                                                <td className={`px-4 py-3 text-center text-lg font-bold ${awayWonSet ? 'text-emerald-400' : 'text-zinc-500'
                                                    }`}>
                                                    {set.away}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer with Actions */}
                <div className="p-6 bg-zinc-900/50 border-t border-zinc-800">
                    <p className="text-sm text-zinc-400 text-center mb-4">
                        El partido ha finalizado. Puedes revisarlo más tarde desde la sección de Partidos.
                    </p>

                    <div className="flex gap-3">
                        <Button
                            variant="primary"
                            size="lg"
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            icon={ArrowLeft}
                            onClick={onGoToMatches}
                        >
                            Volver a Partidos
                        </Button>

                        {onGoToAnalysis && (
                            <Button
                                variant="secondary"
                                size="lg"
                                className="flex-1"
                                icon={BarChart3}
                                onClick={onGoToAnalysis}
                            >
                                Ver Análisis
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
