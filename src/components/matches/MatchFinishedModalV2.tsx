import { Trophy, ArrowLeft, BarChart3, Clock, AlertCircle, TrendingUp, Hash } from 'lucide-react'
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
        stats?: {
            duration: string
            totalPointsHome: number
            totalPointsAway: number
            ownErrors: number
            opponentErrors: number
            homeMaxStreak: number
            awayMaxStreak: number
        }
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

    const { homeTeamName, awayTeamName, sets, homeSetsWon, awaySetsWon, date, time, competition, stats } = matchInfo

    // Determine winner for styling
    const homeWon = homeSetsWon > awaySetsWon
    const awayWon = awaySetsWon > homeSetsWon

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-500">
            <div className="bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg border border-zinc-800 animate-in zoom-in-95 duration-300 overflow-hidden relative">

                {/* Decorative sheen */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500 opacity-80" />

                {/* Header */}
                <div className="relative p-6 border-b border-zinc-800/50 bg-zinc-900/50">
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-emerald-900/30 rounded-full border border-emerald-500/30 ring-4 ring-emerald-900/20 shadow-lg shadow-emerald-900/40">
                            <Trophy className="w-8 h-8 text-emerald-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-1 uppercase tracking-wider">
                            Partido Finalizado
                        </h2>

                        {/* Match Info */}
                        {(date || time || competition) && (
                            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-zinc-400 uppercase tracking-wide font-medium">
                                {(date || time) && (
                                    <span className="flex items-center gap-1">
                                        <Clock size={12} className="text-zinc-500" />
                                        {date} {time && `• ${time}`}
                                    </span>
                                )}
                                {competition && (
                                    <>
                                        <span className="text-zinc-600">•</span>
                                        <span className="text-emerald-400/80">{competition}</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content Scrollable Area */}
                <div className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">

                    {/* Result Summary */}
                    <div className="p-6 pb-2">
                        <div className="flex items-center justify-between gap-4 mb-6">
                            {/* Home Team */}
                            <div className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl transition-all ${homeWon ? 'bg-emerald-900/10 border border-emerald-500/20' : ''}`}>
                                <h3 className={`text-lg font-bold text-center leading-tight mb-2 ${homeWon ? 'text-emerald-400' : 'text-zinc-400'}`}>
                                    {homeTeamName}
                                </h3>
                                <div className={`text-4xl font-black ${homeWon ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                    {homeSetsWon}
                                </div>
                            </div>

                            {/* VS/Dash */}
                            <div className="flex flex-col items-center justify-center px-2">
                                <span className="text-xl font-bold text-zinc-600">-</span>
                            </div>

                            {/* Away Team */}
                            <div className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl transition-all ${awayWon ? 'bg-emerald-900/10 border border-emerald-500/20' : ''}`}>
                                <h3 className={`text-lg font-bold text-center leading-tight mb-2 ${awayWon ? 'text-emerald-400' : 'text-zinc-400'}`}>
                                    {awayTeamName}
                                </h3>
                                <div className={`text-4xl font-black ${awayWon ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                    {awaySetsWon}
                                </div>
                            </div>
                        </div>

                        {/* Sets Table */}
                        {sets.length > 0 && (
                            <div className="bg-zinc-800/40 rounded-xl border border-zinc-700/50 overflow-hidden mb-6">
                                <table className="w-full">
                                    <thead className="bg-zinc-800/60">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Set</th>
                                            <th className={`px-3 py-2 text-center text-[10px] font-bold uppercase tracking-widest ${homeWon ? 'text-emerald-500' : 'text-zinc-500'}`}>Nosotros</th>
                                            <th className={`px-3 py-2 text-center text-[10px] font-bold uppercase tracking-widest ${awayWon ? 'text-emerald-500' : 'text-zinc-500'}`}>Rival</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/50">
                                        {sets.map((set) => (
                                            <tr key={set.setNumber} className="hover:bg-zinc-800/30 transition-colors">
                                                <td className="px-3 py-2 text-xs font-medium text-zinc-400">Set {set.setNumber}</td>
                                                <td className={`px-3 py-2 text-center text-sm font-bold ${set.home > set.away ? 'text-emerald-400' : 'text-zinc-500'}`}>{set.home}</td>
                                                <td className={`px-3 py-2 text-center text-sm font-bold ${set.away > set.home ? 'text-emerald-400' : 'text-zinc-500'}`}>{set.away}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Mini-Summary (Stats) */}
                        {stats && (
                            <div className="mb-4">
                                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 text-center border-b border-zinc-800 pb-2">
                                    Resumen Rápido
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Duration */}
                                    <div className="col-span-2 flex items-center justify-between p-2.5 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
                                        <div className="flex items-center gap-2">
                                            <Clock size={14} className="text-zinc-400" />
                                            <span className="text-xs text-zinc-300">Duración Total</span>
                                        </div>
                                        <span className="text-sm font-mono font-bold text-white">{stats.duration}</span>
                                    </div>

                                    {/* Total Points */}
                                    <div className="flex flex-col p-2.5 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Hash size={12} className="text-blue-400" />
                                            <span className="text-[10px] text-zinc-400 uppercase font-bold">Puntos Totales</span>
                                        </div>
                                        <div className="flex justify-between items-baseline mt-1">
                                            <span className="text-xs text-zinc-500">Nos/Riv</span>
                                            <span className="text-sm font-mono font-bold text-white">
                                                <span className="text-blue-300">{stats.totalPointsHome}</span>
                                                <span className="text-zinc-600 mx-1">/</span>
                                                <span className="text-orange-300">{stats.totalPointsAway}</span>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Errors */}
                                    <div className="flex flex-col p-2.5 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <AlertCircle size={12} className="text-rose-400" />
                                            <span className="text-[10px] text-zinc-400 uppercase font-bold">Errores</span>
                                        </div>
                                        <div className="flex justify-between items-baseline mt-1">
                                            <span className="text-xs text-zinc-500">Propios/Riv</span>
                                            <span className="text-sm font-mono font-bold text-white">
                                                <span className="text-rose-300">{stats.ownErrors}</span>
                                                <span className="text-zinc-600 mx-1">/</span>
                                                <span className="text-emerald-300">{stats.opponentErrors}</span>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Streaks */}
                                    <div className="col-span-2 flex items-center justify-between p-2.5 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp size={14} className="text-amber-400" />
                                            <span className="text-xs text-zinc-300">Mejor Racha (A favor / En contra)</span>
                                        </div>
                                        <span className="text-sm font-mono font-bold text-white">
                                            <span className="text-emerald-400">+{stats.homeMaxStreak}</span>
                                            <span className="text-zinc-600 mx-2">|</span>
                                            <span className="text-rose-400">-{stats.awayMaxStreak}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer with Actions */}
                <div className="p-6 bg-zinc-900 border-t border-zinc-800">
                    <p className="text-xs text-zinc-500 text-center mb-4">
                        El partido ha finalizado. Puedes revisarlo en detalle desde la sección de análisis.
                    </p>

                    <div className="flex flex-col gap-3">
                        <Button
                            variant="primary"
                            size="lg"
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 uppercase tracking-wider"
                            onClick={onGoToMatches}
                        >
                            <ArrowLeft size={18} className="mr-2" />
                            Volver a Partidos
                        </Button>

                        {onGoToAnalysis && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-zinc-400 hover:text-white hover:bg-zinc-800"
                                onClick={onGoToAnalysis}
                            >
                                <BarChart3 size={16} className="mr-2" />
                                Ver Análisis Completo
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
