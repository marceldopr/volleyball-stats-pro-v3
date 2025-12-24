import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronUp, Clock, TrendingUp, Users, AlertCircle, Hash, RefreshCw, Timer } from 'lucide-react'
import { useMatchStore } from '@/stores/matchStore'
import { useMatchData } from '@/hooks/match/useMatchData'
import {
    calculateMatchDuration,
    calculatePointsByType,
    calculatePlayerStats,
    calculateReceptionStats,
    extractSubstitutions,
    extractTimeouts,
    calculateMaxStreaks
} from '@/lib/analysis/matchAnalytics'
import { Button } from '@/components/ui/Button'

import { calculateGameFlow } from '@/lib/volleyball/gameFlow'
import { SetGameFlowChart } from '@/components/match/SetGameFlowChart'

export function MatchAnalysis() {
    const { matchId } = useParams<{ matchId: string }>()
    const navigate = useNavigate()

    const [timelineExpanded, setTimelineExpanded] = useState(false)

    // Store state
    const { derivedState, loadMatch, setInitialOnCourtPlayers, reset } = useMatchStore()
    const homeTeamName = useMatchStore(state => state.homeTeamName)
    const awayTeamName = useMatchStore(state => state.awayTeamName)
    const events = useMatchStore(state => state.events)
    const ourSide = useMatchStore(state => state.ourSide)
    const initialOnCourtPlayers = useMatchStore(state => state.initialOnCourtPlayers)

    // Use the same hook as LiveMatchScouting to properly load match data  
    // This ensures convocations are loaded and setInitialOnCourtPlayers is called
    const { loading, matchData, availablePlayers } = useMatchData({
        matchId,
        loadMatch,
        setInitialOnCourtPlayers,
        reset
    })

    // Calculate analytics
    const analytics = useMemo(() => {
        if (!matchData || events.length === 0 || availablePlayers.length === 0) return null

        // Use ALL available players (including libero) for name lookups
        // initialOnCourtPlayers only has 6 starters, but reception stats need libero too
        const allPlayers = availablePlayers

        return {
            duration: calculateMatchDuration(events),
            pointsByType: calculatePointsByType(events, ourSide),
            playerStats: calculatePlayerStats(events, allPlayers, ourSide),
            receptionStats: calculateReceptionStats(events, allPlayers),
            substitutions: extractSubstitutions(events),
            timeouts: extractTimeouts(events, ourSide),
            streaks: calculateMaxStreaks(events, ourSide),
            gameFlow: calculateGameFlow(events, ourSide)
        }
    }, [matchData, events, initialOnCourtPlayers, ourSide])

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
                    <p className="text-zinc-400">Cargando análisis...</p>
                </div>
            </div>
        )
    }

    if (!matchData || !analytics) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-white mb-2">Partido no encontrado</h2>
                    <Button variant="secondary" onClick={() => navigate('/matches')}>
                        <ArrowLeft size={16} className="mr-2" />
                        Volver a Partidos
                    </Button>
                </div>
            </div>
        )
    }

    const ourTeamName = ourSide === 'home' ? homeTeamName : awayTeamName
    const rivalTeamName = ourSide === 'home' ? awayTeamName : homeTeamName

    // Calculate total points
    const totalHomePoints = Object.values(analytics.pointsByType.home).reduce((a, b) => a + b, 0)
    const totalAwayPoints = Object.values(analytics.pointsByType.away).reduce((a, b) => a + b, 0)
    const ourPoints = ourSide === 'home' ? totalHomePoints : totalAwayPoints
    const rivalPoints = ourSide === 'home' ? totalAwayPoints : totalHomePoints

    // Count errors
    const rivalSide: 'home' | 'away' = ourSide === 'home' ? 'away' : 'home'
    const ownErrors = analytics.pointsByType[rivalSide].opponentError
    const opponentErrors = analytics.pointsByType[ourSide].opponentError

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100">
            {/* Sticky Header */}
            <div className="sticky top-0 z-50 bg-zinc-900 border-b border-zinc-800 shadow-lg">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/matches')}
                        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={20} />
                        <span className="font-semibold">Volver</span>
                    </button>

                    <div className="text-center flex-1">
                        <h1 className="text-xl font-bold text-white">Análisis del Partido</h1>
                        <p className="text-sm text-zinc-400">{homeTeamName} vs {awayTeamName}</p>
                    </div>

                    <div className="w-24" />
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

                {/* Block 1: Executive Summary */}
                <section className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <TrendingUp size={20} className="text-emerald-400" />
                        Resumen Ejecutivo
                    </h2>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-zinc-800/40 p-4 rounded-lg border border-zinc-700/30">
                            <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Resultado</div>
                            <div className="text-2xl font-black text-white">
                                <span className="text-emerald-400">{derivedState.setsWonHome || 0}</span>
                                <span className="text-zinc-600 mx-2">-</span>
                                <span className="text-orange-400">{derivedState.setsWonAway || 0}</span>
                            </div>
                        </div>

                        <div className="bg-zinc-800/40 p-4 rounded-lg border border-zinc-700/30">
                            <div className="text-xs text-zinc-500 uppercase font-bold mb-1 flex items-center gap-1">
                                <Clock size={12} />
                                Duración
                            </div>
                            <div className="text-2xl font-black text-white">{analytics.duration}</div>
                        </div>

                        <div className="bg-zinc-800/40 p-4 rounded-lg border border-zinc-700/30">
                            <div className="text-xs text-zinc-500 uppercase font-bold mb-1 flex items-center gap-1">
                                <Hash size={12} />
                                Puntos
                            </div>
                            <div className="text-lg font-mono font-bold text-white">
                                <span className="text-blue-400">{ourPoints}</span>
                                <span className="text-zinc-600 mx-1">/</span>
                                <span className="text-orange-400">{rivalPoints}</span>
                            </div>
                        </div>

                        <div className="bg-zinc-800/40 p-4 rounded-lg border border-zinc-700/30">
                            <div className="text-xs text-zinc-500 uppercase font-bold mb-1 flex items-center gap-1">
                                <AlertCircle size={12} />
                                Errores
                            </div>
                            <div className="text-lg font-mono font-bold text-white">
                                <span className="text-rose-400">{ownErrors}</span>
                                <span className="text-zinc-600 mx-1">/</span>
                                <span className="text-emerald-400">{opponentErrors}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
                        <span className="text-sm text-zinc-400">Mejor racha</span>
                        <span className="text-sm font-mono font-bold">
                            <span className="text-emerald-400">+{analytics.streaks.homeMaxStreak}</span>
                            <span className="text-zinc-600 mx-2">|</span>
                            <span className="text-rose-400">-{analytics.streaks.awayMaxStreak}</span>
                        </span>
                    </div>
                </section>

                {/* Block 3: Team Action Statistics */}
                <section data-testid="executive-summary" className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                    <h2 className="text-lg font-bold text-white mb-4">Estadísticas por Tipo de Acción</h2>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-zinc-800">
                                    <th className="text-left py-2 px-3 text-xs font-bold text-zinc-400 uppercase">Acción</th>
                                    <th className="text-center py-2 px-3 text-xs font-bold text-blue-400 uppercase">{ourTeamName}</th>
                                    <th className="text-center py-2 px-3 text-xs font-bold text-orange-400 uppercase">{rivalTeamName}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                <tr className="hover:bg-zinc-800/30">
                                    <td className="py-2 px-3 text-sm text-zinc-300">Punto Ataque</td>
                                    <td className="py-2 px-3 text-center text-sm font-bold text-blue-300">
                                        {analytics.pointsByType[ourSide].attack}
                                    </td>
                                    <td className="py-2 px-3 text-center text-sm font-bold text-orange-300">
                                        {analytics.pointsByType[rivalSide].attack}
                                    </td>
                                </tr>
                                <tr className="hover:bg-zinc-800/30">
                                    <td className="py-2 px-3 text-sm text-zinc-300">Punto Bloqueo</td>
                                    <td className="py-2 px-3 text-center text-sm font-bold text-blue-300">
                                        {analytics.pointsByType[ourSide].block}
                                    </td>
                                    <td className="py-2 px-3 text-center text-sm font-bold text-orange-300">
                                        {analytics.pointsByType[rivalSide].block}
                                    </td>
                                </tr>
                                <tr className="hover:bg-zinc-800/30">
                                    <td className="py-2 px-3 text-sm text-zinc-300">Punto Saque</td>
                                    <td className="py-2 px-3 text-center text-sm font-bold text-blue-300">
                                        {analytics.pointsByType[ourSide].serve}
                                    </td>
                                    <td className="py-2 px-3 text-center text-sm font-bold text-orange-300">
                                        {analytics.pointsByType[rivalSide].serve}
                                    </td>
                                </tr>
                                <tr className="hover:bg-zinc-800/30">
                                    <td className="py-2 px-3 text-sm text-zinc-300">Error Rival</td>
                                    <td className="py-2 px-3 text-center text-sm font-bold text-emerald-400">
                                        {analytics.pointsByType[ourSide].opponentError}
                                    </td>
                                    <td className="py-2 px-3 text-center text-sm font-bold text-emerald-400">
                                        {analytics.pointsByType[rivalSide].opponentError}
                                    </td>
                                </tr>
                                <tr className="bg-zinc-800/50 font-bold">
                                    <td className="py-2 px-3 text-sm text-white">TOTAL</td>
                                    <td className="py-2 px-3 text-center text-base font-black text-blue-400">
                                        {ourPoints}
                                    </td>
                                    <td className="py-2 px-3 text-center text-base font-black text-orange-400">
                                        {rivalPoints}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Block 4: Player Performance */}
                {analytics.playerStats.length > 0 && (
                    <section className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Users size={20} className="text-purple-400" />
                            Rendimiento por Jugadora
                        </h2>

                        <div data-testid="player-stats" className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-zinc-800">
                                        <th className="text-left py-2 px-3 text-xs font-bold text-zinc-400 uppercase">Jugadora</th>
                                        <th className="text-center py-2 px-3 text-xs font-bold text-emerald-400 uppercase">✓</th>
                                        <th className="text-center py-2 px-3 text-xs font-bold text-rose-400 uppercase">✗</th>
                                        <th className="text-center py-2 px-3 text-xs font-bold text-zinc-400 uppercase">Balance</th>
                                        <th className="text-center py-2 px-3 text-xs font-bold text-zinc-400 uppercase">Recepciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/50">
                                    {analytics.playerStats.map(player => {
                                        const balance = player.positiveActions - player.negativeActions
                                        const receptionAvg = player.receptions > 0
                                            ? (player.receptionTotal / player.receptions).toFixed(1)
                                            : '-'

                                        return (
                                            <tr key={player.playerId} className="hover:bg-zinc-800/30">
                                                <td className="py-2 px-3 text-sm text-zinc-200 font-medium">{player.playerName}</td>
                                                <td className="py-2 px-3 text-center text-sm font-bold text-emerald-400">
                                                    {player.positiveActions}
                                                </td>
                                                <td className="py-2 px-3 text-center text-sm font-bold text-rose-400">
                                                    {player.negativeActions}
                                                </td>
                                                <td className={`py-2 px-3 text-center text-sm font-bold ${balance > 0 ? 'text-emerald-400' : balance < 0 ? 'text-rose-400' : 'text-zinc-500'
                                                    }`}>
                                                    {balance > 0 ? '+' : ''}{balance}
                                                </td>
                                                <td className="py-2 px-3 text-center text-xs font-mono text-zinc-300">
                                                    {player.receptions > 0 ? `${player.receptions} (${receptionAvg})` : '-'}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* Block 5: Reception Analysis */}
                {analytics.receptionStats.total > 0 && (
                    <section className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                        <h2 className="text-lg font-bold text-white mb-4">Análisis de Recepción</h2>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Distribution */}
                            <div>
                                <h3 className="text-sm font-semibold text-zinc-400 mb-3 uppercase">Distribución</h3>
                                <div className="space-y-2">
                                    {[4, 3, 2, 1, 0].map(rating => {
                                        const count = analytics.receptionStats.byRating[rating] || 0
                                        const percentage = analytics.receptionStats.total > 0
                                            ? Math.round((count / analytics.receptionStats.total) * 100)
                                            : 0

                                        return (
                                            <div key={rating} className="flex items-center gap-3">
                                                <span className="text-xs font-mono font-bold text-zinc-500 w-4">{rating}</span>
                                                <div className="flex-1 bg-zinc-800 rounded-full h-6 overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all ${rating >= 3 ? 'bg-emerald-500' :
                                                            rating === 2 ? 'bg-amber-500' : 'bg-rose-500'
                                                            }`}
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-mono font-bold text-zinc-400 w-16 text-right">
                                                    {count} ({percentage}%)
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>

                                <div className="mt-4 p-3 bg-emerald-900/20 border border-emerald-500/30 rounded-lg">
                                    <div className="text-xs text-emerald-400 uppercase font-bold">Recepciones Positivas (3-4)</div>
                                    <div className="text-2xl font-black text-emerald-400 mt-1">
                                        {analytics.receptionStats.positivePercentage}%
                                    </div>
                                </div>
                            </div>

                            {/* By Player */}
                            <div>
                                <h3 className="text-sm font-semibold text-zinc-400 mb-3 uppercase">Por Jugadora</h3>
                                <div className="space-y-2">
                                    {analytics.receptionStats.byPlayer
                                        .sort((a, b) => b.count - a.count)
                                        .map(player => (
                                            <div key={player.playerId} className="flex items-center justify-between p-2 bg-zinc-800/40 rounded">
                                                <span className="text-sm text-zinc-300">{player.playerName}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-mono text-zinc-500">{player.count} rec</span>
                                                    <span className={`text-sm font-bold font-mono ${player.average >= 3 ? 'text-emerald-400' :
                                                        player.average >= 2 ? 'text-amber-400' : 'text-rose-400'
                                                        }`}>
                                                        {player.average.toFixed(1)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Block 6: Technical Decisions */}
                <section className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <RefreshCw size={20} className="text-cyan-400" />
                        Decisiones Técnicas
                    </h2>

                    <div className="space-y-6">
                        {/* Substitutions */}
                        {analytics.substitutions.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-zinc-400 mb-3 uppercase">Sustituciones ({analytics.substitutions.length})</h3>
                                <div className="space-y-2">
                                    {analytics.substitutions.map((sub, idx) => {
                                        // Look up player names from ALL available players (includes libero)
                                        const playerOutName = availablePlayers.find(p => p.id === sub.playerOut)?.name || sub.playerOut.slice(0, 8)
                                        const playerInName = availablePlayers.find(p => p.id === sub.playerIn)?.name || sub.playerIn.slice(0, 8)

                                        return (
                                            <div key={idx} className="flex items-center gap-3 p-2 bg-zinc-800/40 rounded text-sm">
                                                <span className="text-zinc-500 font-mono text-xs">Set {sub.setNumber}</span>
                                                <span className="text-zinc-400">P{sub.position}</span>
                                                <span className="text-rose-400">↓ {playerOutName}</span>
                                                <RefreshCw size={12} className="text-cyan-400" />
                                                <span className="text-emerald-400">↑ {playerInName}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Timeouts */}
                        {analytics.timeouts.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-zinc-400 mb-3 uppercase flex items-center gap-2">
                                    <Timer size={14} />
                                    Tiempos Muertos ({analytics.timeouts.length})
                                </h3>
                                <div className="space-y-2">
                                    {analytics.timeouts.map((timeout, idx) => {
                                        const teamName = timeout.team === 'home' ? homeTeamName : awayTeamName
                                        return (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-zinc-800/40 rounded">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-mono text-zinc-500">Set {timeout.setNumber}</span>
                                                    <span className={`text-sm font-semibold ${timeout.team === ourSide ? 'text-blue-400' : 'text-orange-400'
                                                        }`}>
                                                        {teamName}
                                                    </span>
                                                </div>
                                                <span className="text-sm font-mono text-zinc-400">
                                                    {timeout.scoreHome} - {timeout.scoreAway}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {analytics.substitutions.length === 0 && analytics.timeouts.length === 0 && (
                            <div className="text-center text-zinc-500 py-8 italic text-sm">
                                No se registraron decisiones técnicas en este partido
                            </div>
                        )}
                    </div>
                </section>

                {/* Block 7: Evolución por Set (Game Flow Chart) */}
                {analytics.gameFlow.length > 0 && (
                    <section className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <TrendingUp size={20} className="text-cyan-400" />
                            Evolución por Set
                        </h2>

                        <div className="space-y-4">
                            {analytics.gameFlow.map(setData => (
                                <SetGameFlowChart
                                    key={setData.setNumber}
                                    data={setData}
                                    ourSide={ourSide}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Block 8: Timeline (Collapsible - Secondary) */}
                <section className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                    <button
                        onClick={() => setTimelineExpanded(!timelineExpanded)}
                        className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors"
                    >
                        <span className="text-sm font-medium text-zinc-400">Ver eventos detallados ({events.length})</span>
                        {timelineExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {timelineExpanded && (
                        <div className="border-t border-zinc-800 p-4 max-h-64 overflow-y-auto">
                            <div className="space-y-1">
                                {events.map((event, idx) => (
                                    <div key={event.id} className="p-2 bg-zinc-800/30 rounded text-xs">
                                        <span className="text-zinc-500 font-mono">{idx + 1}.</span>
                                        <span className="text-zinc-300 ml-2">{event.type}</span>
                                        {event.payload?.reason && (
                                            <span className="text-zinc-500 ml-2">- {event.payload.reason}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>

            </div>
        </div>
    )
}
