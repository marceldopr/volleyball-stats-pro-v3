import { useState, useEffect, useMemo } from 'react'
import { Loader2, Calendar, History, TrendingUp, Activity, PieChart, Info } from 'lucide-react'
import { teamStatsService, PlayerAggregatedStats, TeamEvolutionData, TeamKPIs } from '@/services/teamStatsService'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabaseClient'
import { clubRankingsService, TeamStanding } from '@/services/clubRankingsService'
import { ClubTeamRankingCard } from '@/components/dashboard/ClubTeamRankingCard'
import { useNavigate } from 'react-router-dom'


// --- Inline UI Components (since @/components/ui/card is missing) ---
function Card({ children, className = '' }: { children: React.ReactNode, className?: string }) {
    return <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden ${className}`}>{children}</div>
}

function CardHeader({ children, className = '' }: { children: React.ReactNode, className?: string }) {
    return <div className={`px-6 py-4 border-b border-gray-100 dark:border-gray-700/50 ${className}`}>{children}</div>
}

function CardTitle({ children, className = '' }: { children: React.ReactNode, className?: string }) {
    return <h3 className={`text-base font-semibold text-gray-900 dark:text-white ${className}`}>{children}</h3>
}

function CardContent({ children, className = '' }: { children: React.ReactNode, className?: string }) {
    return <div className={`p-6 ${className}`}>{children}</div>
}
// ---------------------------------------------------------------------

interface TeamStatsTabProps {
    teamId?: string
    teamIds?: string[]
    seasonId: string
}

export function TeamStatsTab({ teamId, teamIds, seasonId }: TeamStatsTabProps) {
    const [loading, setLoading] = useState(true)
    const [timeRange, setTimeRange] = useState<'season' | 'last5'>('season')
    const [playerStats, setPlayerStats] = useState<PlayerAggregatedStats[]>([])
    const [evolutionData, setEvolutionData] = useState<TeamEvolutionData[]>([])
    const [kpis, setKpis] = useState<TeamKPIs | null>(null)
    const [winLoss, setWinLoss] = useState<{ wins: number, losses: number, setsWon: number, setsLost: number, pointsScored: number, pointsLost: number }>({ wins: 0, losses: 0, setsWon: 0, setsLost: 0, pointsScored: 0, pointsLost: 0 })
    const [standings, setStandings] = useState<TeamStanding[]>([])
    const navigate = useNavigate()

    useEffect(() => {
        loadData()
    }, [teamId, teamIds, seasonId, timeRange])

    const loadData = async () => {
        try {
            setLoading(true)
            const limit = timeRange === 'last5' ? 5 : undefined

            // If we have a single team, we can get specific KPIs and Records
            // If multiple, we might need to aggregate differently (skipping for now based on user focus)

            const targetTeamId = teamId || (teamIds && teamIds.length === 1 ? teamIds[0] : null)

            if (targetTeamId) {
                const [stats, teamKPIs, evolution, record] = await Promise.all([
                    teamStatsService.getTeamPlayerStats(targetTeamId, seasonId, limit),
                    teamStatsService.getTeamKPIs(targetTeamId, seasonId, limit),
                    teamStatsService.getTeamStatsEvolution(targetTeamId, seasonId, limit),
                    teamStatsService.getWinLossRecord(targetTeamId, seasonId)
                ])
                setPlayerStats(stats)
                setKpis(teamKPIs)
                setEvolutionData(evolution)
                setWinLoss(record)
            } else if (teamIds) {
                // Multi-team aggregation
                const stats = await teamStatsService.getMultiTeamPlayerStats(teamIds, seasonId, limit)
                const aggregatedKPIs = await teamStatsService.getMultiTeamKPIs(teamIds, seasonId, limit)

                // Aggregate win/loss records from all teams
                const recordPromises = teamIds.map(teamId =>
                    teamStatsService.getWinLossRecord(teamId, seasonId)
                )
                const allRecords = await Promise.all(recordPromises)

                const aggregatedWinLoss = allRecords.reduce((acc, record) => ({
                    wins: acc.wins + record.wins,
                    losses: acc.losses + record.losses,
                    setsWon: acc.setsWon + record.setsWon,
                    setsLost: acc.setsLost + record.setsLost,
                    pointsScored: acc.pointsScored + record.pointsScored,
                    pointsLost: acc.pointsLost + record.pointsLost
                }), { wins: 0, losses: 0, setsWon: 0, setsLost: 0, pointsScored: 0, pointsLost: 0 })

                setPlayerStats(stats)
                setKpis(aggregatedKPIs) // Now we have actual KPIs (specifically Opponent Errors)
                setEvolutionData([])
                setWinLoss(aggregatedWinLoss)
            }

            // Fetch club ranking (Shared Logic)
            const refTeamId = targetTeamId || (teamIds && teamIds.length > 0 ? teamIds[0] : null)
            if (refTeamId) {
                const { data: teamData } = await supabase.from('teams').select('club_id').eq('id', refTeamId).single()
                if (teamData?.club_id) {
                    const rankings = await clubRankingsService.getClubStandings(seasonId, teamData.club_id)
                    setStandings(rankings)
                }
            }

        } catch (error) {
            console.error('Error loading team stats:', error)
            toast.error('Error al cargar las estadísticas')
        } finally {
            setLoading(false)
        }
    }

    // --- AGGREGATION LOGIC ---
    const teamStats = useMemo(() => {
        // Sum of all players
        const totalAttackPoints = playerStats.reduce((acc, p) => acc + p.points.attack, 0)
        const totalServePoints = playerStats.reduce((acc, p) => acc + p.points.serve, 0)
        const totalBlockPoints = playerStats.reduce((acc, p) => acc + p.points.block, 0)
        const totalPointsEarned = totalAttackPoints + totalServePoints + totalBlockPoints

        // Own points (Explicit priority: explicit opp errors first, then winLoss, then inferred)
        const totalOwnPoints = winLoss.pointsScored || (kpis ? kpis.totalOwnPoints : totalPointsEarned)

        // Opponent Errors: Prefer explicit count if available (kpis.totalOpponentErrors from new service)
        const opponentErrorPoints = (kpis?.totalOpponentErrors !== undefined)
            ? kpis.totalOpponentErrors
            : Math.max(0, totalOwnPoints - totalPointsEarned)

        // Efficiency Aggregates
        // Since attackAttempts is missing in PlayerAggregatedStats, we'll refrain from calculating exact attack efficiency here
        // and rely on what's available. We can use volume to check "Activity".

        // Block 1: Results
        const matchesPlayed = winLoss.wins + winLoss.losses
        const setsPlayed = winLoss.setsWon + winLoss.setsLost // or kpis.totalSets
        const pointsScored = winLoss.pointsScored || 0
        const pointsLost = winLoss.pointsLost || 0
        const pointsPerSet = setsPlayed > 0 ? (pointsScored / setsPlayed).toFixed(1) : '0'

        // Block 2: Distribution
        const safeTotal = totalOwnPoints || 1
        const pctAttack = Math.round((totalAttackPoints / safeTotal) * 100)
        const pctServe = Math.round((totalServePoints / safeTotal) * 100)
        const pctBlock = Math.round((totalBlockPoints / safeTotal) * 100)
        const pctOppErrors = Math.round((opponentErrorPoints / safeTotal) * 100)

        // Block 3: Efficiency
        const totalErrors = playerStats.reduce((acc, p) => acc + p.errors.total, 0)
        const ratio = totalErrors > 0 ? (pointsScored / totalErrors).toFixed(2) : '∞'
        const errorsPerSet = setsPlayed > 0 ? (totalErrors / setsPlayed).toFixed(1) : '0'

        // Block 4: Volume
        const totalActions = playerStats.reduce((acc, p) => acc + p.volume.total, 0)
        const actionsPerSet = setsPlayed > 0 ? (totalActions / setsPlayed).toFixed(0) : '0'


        return {
            matchesPlayed,
            setsPlayed,
            pointsScored,
            pointsLost,
            pointsPerSet,

            // Profile
            pctAttack,
            pctServe,
            pctBlock,
            pctOppErrors,

            // Efficiency
            ratio,
            errorsPerSet,

            // Volume
            totalActions,
            actionsPerSet
        }
    }, [playerStats, kpis, winLoss])


    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        )
    }

    if (!teamId && (!teamIds || teamIds.length === 0)) {
        return <div className="text-center p-8 text-gray-500">Selecciona un equipo para ver sus estadísticas.</div>
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Controls */}
            <div className="flex justify-end">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700 inline-flex">
                    <button
                        onClick={() => setTimeRange('season')}
                        className={`
                            flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                            ${timeRange === 'season'
                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }
                        `}
                    >
                        <Calendar className="w-4 h-4" />
                        Temporada
                    </button>
                    <button
                        onClick={() => setTimeRange('last5')}
                        className={`
                            flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                            ${timeRange === 'last5'
                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }
                        `}
                    >
                        <History className="w-4 h-4" />
                        Últimos 5
                    </button>
                </div>
            </div>

            {/* BLOCK 1: Team Results */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500 uppercase flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Resultados Globales
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{teamStats.matchesPlayed}</div>
                            <div className="text-xs text-gray-500 uppercase mt-1">Partidos</div>
                            <div className="text-sm font-medium text-emerald-600 mt-1">
                                {winLoss.wins}W - {winLoss.losses}L
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{winLoss.setsWon} - {winLoss.setsLost}</div>
                            <div className="text-xs text-gray-500 uppercase mt-1">Sets</div>
                            <div className="text-sm text-gray-400 mt-1">
                                {teamStats.setsPlayed} totales
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{teamStats.pointsScored} - {teamStats.pointsLost}</div>
                            <div className="text-xs text-gray-500 uppercase mt-1">Puntos</div>
                            <div className="text-sm text-gray-400 mt-1">
                                Balances
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{teamStats.pointsPerSet}</div>
                            <div className="text-xs text-gray-500 uppercase mt-1">Puntos / Set</div>
                            <div className="text-sm text-gray-400 mt-1">
                                Media
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Club Ranking Card */}
            <ClubTeamRankingCard
                standings={standings}
                currentTeamId={teamId || (teamIds?.[0])}
                onTeamSelect={(id) => navigate(`/teams/${id}/dashboard`)}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* BLOCK 2: Scoring Profile */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 uppercase flex items-center gap-2">
                            <PieChart className="w-4 h-4" />
                            Perfil de Puntuación
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <PercentageBar label="Ataque" percent={teamStats.pctAttack} color="bg-blue-500" />
                            <PercentageBar label="Saque" percent={teamStats.pctServe} color="bg-emerald-500" />
                            <PercentageBar label="Bloqueo" percent={teamStats.pctBlock} color="bg-purple-500" />
                            <PercentageBar label="Errores Rival" percent={teamStats.pctOppErrors} color="bg-gray-400" />
                        </div>
                    </CardContent>
                </Card>

                {/* BLOCK 3 & 4: Efficiency & Volume */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 uppercase flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            Eficiencia y Volumen
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-2">
                                <span className="text-sm text-gray-600 dark:text-gray-300">Ratio Pts/Err</span>
                                <span className={`text-lg font-bold ${Number(teamStats.ratio) > 1.2 ? 'text-green-600' : 'text-orange-500'}`}>
                                    {teamStats.ratio}
                                </span>
                            </div>
                            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-2">
                                <span className="text-sm text-gray-600 dark:text-gray-300">Errores/Set</span>
                                <span className="text-lg font-bold text-red-500">
                                    {teamStats.errorsPerSet}
                                </span>
                            </div>
                            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-2">
                                <span className="text-sm text-gray-600 dark:text-gray-300">Acciones Totales</span>
                                <span className="text-lg font-bold text-gray-900 dark:text-white">
                                    {teamStats.totalActions}
                                </span>
                            </div>
                            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-2">
                                <span className="text-sm text-gray-600 dark:text-gray-300">Acciones/Set (Ritmo)</span>
                                <span className="text-lg font-bold text-gray-900 dark:text-white">
                                    {teamStats.actionsPerSet}
                                </span>
                            </div>
                        </div>
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/10 rounded text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
                            <Info className="w-4 h-4 shrink-0 mt-0.5" />
                            La eficiencia de ataque detallada y recepción están disponibles en la pestaña "Rankings" y en el detalle de cada partido.
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* BLOCK 5: Trend */}
            {evolutionData.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 uppercase flex items-center gap-2">
                            <History className="w-4 h-4" />
                            Tendencia (Últimos Partidos)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-900">
                                    <tr>
                                        <th className="px-4 py-3">Fecha</th>
                                        <th className="px-4 py-3">Rival</th>
                                        <th className="px-4 py-3 text-center">Resultado</th>
                                        <th className="px-4 py-3 text-center">Pts/Set</th>
                                        <th className="px-4 py-3 text-center">Err/Set</th>
                                        <th className="px-4 py-3 text-center">Ratio</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {evolutionData.slice(0, 5).map((match) => (
                                        <tr key={match.matchId} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap">
                                                {new Date(match.date).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                                {match.opponent}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {match.setsWon !== undefined && match.setsLost !== undefined ? (
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${match.setsWon > match.setsLost
                                                        ? match.setsWon === 3 && match.setsLost === 2
                                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        : match.setsWon === 2 && match.setsLost === 3
                                                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                        }`}>
                                                        {match.setsWon}-{match.setsLost}
                                                    </span>
                                                ) : (
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${match.result.startsWith('3') && !match.result.startsWith('3-2')
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        : match.result.startsWith('0') || match.result.startsWith('1')
                                                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                                        }`}>
                                                        {match.result}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center font-medium">
                                                {match.stats.pointsPerSet}
                                            </td>
                                            <td className="px-4 py-3 text-center text-red-500">
                                                {match.stats.errorsPerSet}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`font-bold ${match.stats.pointsErrorRatio > 1.2 ? 'text-green-600' : 'text-orange-500'}`}>
                                                    {match.stats.pointsErrorRatio}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

function PercentageBar({ label, percent, color }: { label: string, percent: number, color: string }) {
    return (
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-300">{label}</span>
                <span className="font-bold text-gray-900 dark:text-white">{percent}%</span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                    className={`h-full ${color} rounded-full transition-all duration-500`}
                    style={{ width: `${percent}%` }}
                ></div>
            </div>
        </div>
    )
}
