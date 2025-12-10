import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, Clock, Trophy, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useMatchStoreV2 } from '@/stores/matchStoreV2'
import { matchServiceV2 } from '@/services/matchServiceV2'
import { teamService } from '@/services/teamService'
import { getTeamDisplayName } from '@/utils/teamDisplay'
import { MatchTimelineV2 } from '@/components/MatchTimelineV2'
import { formatTimeline } from '@/utils/timelineFormatter'
import { toast } from 'sonner'

export function MatchAnalysisV2() {
    const { matchId } = useParams<{ matchId: string }>()
    const navigate = useNavigate()

    const [loading, setLoading] = useState(true)
    const [matchData, setMatchData] = useState<any>(null)

    // Load match into store for analysis
    const { derivedState, loadMatch } = useMatchStoreV2()
    const homeTeamName = useMatchStoreV2(state => state.homeTeamName)
    const awayTeamName = useMatchStoreV2(state => state.awayTeamName)
    const events = useMatchStoreV2(state => state.events)

    useEffect(() => {
        if (!matchId) return

        const init = async () => {
            try {
                setLoading(true)

                const match = await matchServiceV2.getMatchV2(matchId)
                if (!match) {
                    toast.error('Partido no encontrado')
                    navigate('/matches')
                    return
                }

                setMatchData(match)

                // Determine Our Side
                const ourSide = match.home_away === 'home' ? 'home' : 'away'

                // Load team data for complete name
                const team = await teamService.getTeamById(match.team_id)
                const teamName = team ? getTeamDisplayName(team) : 'Nuestro Equipo'
                const opponentName = match.opponent_name || 'Rival'

                const homeTeamName = ourSide === 'home' ? teamName : opponentName
                const awayTeamName = ourSide === 'away' ? teamName : opponentName

                // Load Match into Store (READ-ONLY)
                loadMatch(match.id, match.actions || [], ourSide, { home: homeTeamName, away: awayTeamName })

            } catch (error) {
                console.error('Error loading match for analysis:', error)
                toast.error('Error al cargar el análisis del partido')
                navigate('/matches')
            } finally {
                setLoading(false)
            }
        }

        init()
    }, [matchId])

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

    const { setsScores, setsWonHome, setsWonAway } = derivedState

    // Calculate total points
    const totalPointsHome = setsScores.reduce((sum, set) => sum + set.home, 0)
    const totalPointsAway = setsScores.reduce((sum, set) => sum + set.away, 0)

    // Determine winner
    const homeWon = setsWonHome > setsWonAway
    const awayWon = setsWonAway > setsWonHome

    // Format date
    const formattedDate = matchData?.match_date
        ? new Date(matchData.match_date).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })
        : 'Sin fecha'

    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            {/* Header */}
            <div className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <Button
                            variant="ghost"
                            size="sm"
                            icon={ArrowLeft}
                            onClick={() => navigate('/matches')}
                        >
                            Volver a Partidos
                        </Button>

                        <div className="flex items-center gap-2 text-emerald-400">
                            <BarChart3 className="w-5 h-5" />
                            <span className="text-sm font-semibold uppercase tracking-wider">Análisis</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Title Section */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">
                        Análisis del Partido
                    </h1>
                    <div className="flex items-center justify-center gap-3 text-2xl font-bold mb-4">
                        <span className={homeWon ? 'text-emerald-400' : 'text-zinc-300'}>
                            {homeTeamName || 'Local'}
                        </span>
                        <span className="text-zinc-600">vs</span>
                        <span className={awayWon ? 'text-emerald-400' : 'text-zinc-300'}>
                            {awayTeamName || 'Visitante'}
                        </span>
                    </div>

                    {/* match Info */}
                    <div className="flex items-center justify-center gap-4 text-sm text-zinc-400">
                        {formattedDate && formattedDate !== 'Sin fecha' && (
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                <span>{formattedDate}</span>
                            </div>
                        )}
                        {matchData?.match_time && (
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4" />
                                <span>{matchData.match_time}</span>
                            </div>
                        )}
                        {(matchData?.competition_name || matchData?.teams?.category_stage) && (
                            <div className="flex items-center gap-1.5">
                                <Trophy className="w-4 h-4" />
                                <span>{matchData?.competition_name || matchData?.teams?.category_stage}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Summary & Sets */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Result Summary Card */}
                        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-amber-500" />
                                Resultado Final
                            </h2>

                            <div className="flex items-center justify-center gap-6 mb-6">
                                <div className="text-center">
                                    <div className="text-zinc-400 text-sm mb-1">{homeTeamName || 'Local'}</div>
                                    <div className={`text-5xl font-black ${homeWon ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                        {setsWonHome}
                                    </div>
                                </div>

                                <div className="text-3xl font-bold text-zinc-600">-</div>

                                <div className="text-center">
                                    <div className="text-zinc-400 text-sm mb-1">{awayTeamName || 'Visitante'}</div>
                                    <div className={`text-5xl font-black ${awayWon ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                        {setsWonAway}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800/50 rounded-lg">
                                <span className="text-sm text-zinc-400">Estado:</span>
                                <span className="text-sm font-semibold text-emerald-400">Finalizado</span>
                            </div>
                        </div>

                        {/* Sets Table */}
                        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                            <div className="px-6 py-4 border-b border-zinc-800">
                                <h2 className="text-lg font-semibold">Marcador por Sets</h2>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-zinc-800 bg-zinc-800/30">
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                                Set
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                                {homeTeamName || 'Local'}
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                                {awayTeamName || 'Visitante'}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800">
                                        {setsScores.map((set) => {
                                            const homeWonSet = set.home > set.away
                                            const awayWonSet = set.away > set.home

                                            return (
                                                <tr key={set.setNumber} className="hover:bg-zinc-800/30 transition-colors">
                                                    <td className="px-6 py-4 text-sm font-medium text-zinc-300">
                                                        Set {set.setNumber}
                                                    </td>
                                                    <td className={`px-6 py-4 text-center text-xl font-bold ${homeWonSet ? 'text-emerald-400' : 'text-zinc-500'
                                                        }`}>
                                                        {set.home}
                                                    </td>
                                                    <td className={`px-6 py-4 text-center text-xl font-bold ${awayWonSet ? 'text-emerald-400' : 'text-zinc-500'
                                                        }`}>
                                                        {set.away}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Basic Stats */}
                    <div className="space-y-6">
                        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                            <h2 className="text-lg font-semibold mb-4">Estadísticas Básicas</h2>

                            <div className="space-y-4">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-zinc-400">Total Puntos {homeTeamName || 'Local'}</span>
                                        <span className="text-2xl font-bold text-emerald-400">{totalPointsHome}</span>
                                    </div>
                                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-500"
                                            style={{ width: `${(totalPointsHome / (totalPointsHome + totalPointsAway)) * 100}%` }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-zinc-400">Total Puntos {awayTeamName || 'Visitante'}</span>
                                        <span className="text-2xl font-bold text-blue-400">{totalPointsAway}</span>
                                    </div>
                                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500"
                                            style={{ width: `${(totalPointsAway / (totalPointsHome + totalPointsAway)) * 100}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-zinc-800">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-zinc-400">Sets Jugados</span>
                                        <span className="font-semibold text-zinc-200">{setsScores.length}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm mt-2">
                                        <span className="text-zinc-400">Total Acciones</span>
                                        <span className="font-semibold text-zinc-200">{events.length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Info Note */}
                        <div className="bg-blue-900/20 border border-blue-800/50 rounded-xl p-4">
                            <p className="text-sm text-blue-300">
                                <strong>Nota:</strong> Esta es una vista de solo lectura.
                                Las estadísticas detalladas por jugadora estarán disponibles próximamente.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Timeline Section */}
                <div className="mt-8">
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                        <div className="px-6 py-4 border-b border-zinc-800">
                            <h2 className="text-lg font-semibold">Historial Completo del Partido</h2>
                            <p className="text-sm text-zinc-400 mt-1">
                                Cronología detallada de todas las acciones registradas
                            </p>
                        </div>

                        <div className="max-h-[600px] overflow-y-auto">
                            <MatchTimelineV2
                                events={formatTimeline(events, derivedState.ourSide, homeTeamName || 'Local', awayTeamName || 'Visitante')}
                                className="p-4"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
