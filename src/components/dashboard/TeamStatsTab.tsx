import { useState, useEffect } from 'react'
import { Loader2, Calendar, History } from 'lucide-react'
import { teamStatsService, PlayerAggregatedStats, TeamEvolutionData, TeamKPIs, ServeEfficiencyStats, PositionStats } from '@/services/teamStatsService'
import { RankingTable, RankingColumn } from './RankingTable'
import { TeamStatsEvolution } from './TeamStatsEvolution'
import { TeamKPICards } from './TeamKPICards'
import { ServeEfficiencyTable } from './ServeEfficiencyTable'
import { PositionAggregationTable } from './PositionAggregationTable'
import { toast } from 'sonner'

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
    const [serveEfficiency, setServeEfficiency] = useState<ServeEfficiencyStats[]>([])
    const [positionStats, setPositionStats] = useState<PositionStats[]>([])

    useEffect(() => {
        loadData()
    }, [teamId, teamIds, seasonId, timeRange])

    const loadData = async () => {
        try {
            setLoading(true)
            const limit = timeRange === 'last5' ? 5 : undefined

            // Use multi-team or single-team method based on props
            const stats = teamIds
                ? await teamStatsService.getMultiTeamPlayerStats(teamIds, seasonId, limit)
                : await teamStatsService.getTeamPlayerStats(teamId!, seasonId, limit)

            // For single team, load KPIs, serve efficiency, and position stats
            if (teamId) {
                const [teamKPIs, serveEff, posStat, evolution] = await Promise.all([
                    teamStatsService.getTeamKPIs(teamId, seasonId, limit),
                    teamStatsService.getServeEfficiency(teamId, seasonId, limit),
                    teamStatsService.getPositionAggregation(teamId, seasonId, limit),
                    teamStatsService.getTeamStatsEvolution(teamId, seasonId, limit)
                ])

                setKpis(teamKPIs)
                setServeEfficiency(serveEff)
                setPositionStats(posStat)
                setEvolutionData(evolution)
            } else {
                setKpis(null)
                setServeEfficiency([])
                setPositionStats([])
                setEvolutionData([])
            }

            setPlayerStats(stats)
        } catch (error) {
            console.error('Error loading team stats:', error)
            toast.error('Error al cargar las estadísticas')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        )
    }

    // Prepare data for different rankings
    const pointsData = [...playerStats].sort((a, b) => b.points.total - a.points.total)
    const errorsData = [...playerStats].sort((a, b) => b.errors.total - a.errors.total)
    const volumeData = [...playerStats].sort((a, b) => b.volume.total - a.volume.total)
    const ratioData = [...playerStats].sort((a, b) => b.ratios.pointsErrorRatio - a.ratios.pointsErrorRatio)

    // Enriched columns definitions
    const pointsColumns: RankingColumn[] = [
        { key: 'playerName', label: 'Jugadora' },
        { key: 'points.total', label: 'Total', align: 'center', format: (v) => <span className="font-bold">{v}</span> },
        { key: 'points.attack', label: 'Atq', align: 'center' },
        { key: 'points.serve', label: 'Saq', align: 'center' },
        { key: 'points.block', label: 'Blo', align: 'center' },
        { key: 'ratios.pointsPerMatch', label: 'P/P', align: 'center', format: (v) => v.toFixed(1) },
        { key: 'percentageOfTeamPoints', label: '% Pts', align: 'center', format: (v) => `${v.toFixed(1)}%` },
        { key: 'impact', label: 'Imp', align: 'center', format: (v) => <span className={v >= 0 ? 'text-green-600' : 'text-red-600'}>{v > 0 ? '+' : ''}{v}</span> }
    ]

    const errorsColumns: RankingColumn[] = [
        { key: 'playerName', label: 'Jugadora' },
        { key: 'errors.total', label: 'Total', align: 'center', format: (v) => <span className="font-bold text-red-600 dark:text-red-400">{v}</span> },
        { key: 'errors.attack', label: 'Atq', align: 'center' },
        { key: 'errors.serve', label: 'Saq', align: 'center' },
        { key: 'errors.reception', label: 'Rec', align: 'center' },
        { key: 'ratios.errorsPerMatch', label: 'E/P', align: 'center', format: (v) => v.toFixed(1) },
        { key: 'percentageOfTeamErrors', label: '% Err', align: 'center', format: (v) => `${v.toFixed(1)}%` }
    ]

    const volumeColumns: RankingColumn[] = [
        { key: 'playerName', label: 'Jugadora' },
        { key: 'volume.total', label: 'Acciones', align: 'center', format: (v) => <span className="font-bold">{v}</span> },
        { key: 'volume.percentage', label: '% Equipo', align: 'center', format: (v) => `${v.toFixed(1)}%` },
        { key: 'actionsPerSet', label: 'Acc/Set', align: 'center', format: (v) => v.toFixed(1) }
    ]

    const ratioColumns: RankingColumn[] = [
        { key: 'playerName', label: 'Jugadora' },
        { key: 'ratios.pointsErrorRatio', label: 'Ratio', align: 'center', format: (v) => <span className={`font-bold ${v >= 1.5 ? 'text-green-600' : v < 1 ? 'text-red-600' : 'text-blue-600'}`}>{v.toFixed(2)}</span> },
        { key: 'points.total', label: 'Pts', align: 'center' },
        { key: 'errors.total', label: 'Err', align: 'center' }
    ]

    const receptionColumns: RankingColumn[] = [
        { key: 'playerName', label: 'Jugadora' },
        { key: 'receptions', label: 'Recepciones', align: 'center', format: (v) => <span className="font-bold">{v}</span> },
        { key: 'errors.reception', label: 'Errores', align: 'center', format: (v) => <span className="text-red-600 dark:text-red-400">{v}</span> },
        {
            key: 'receptionEfficiency', label: 'Eficiencia', align: 'center', format: (v) => {
                const efficiency = v as number
                return <span className={`font-bold ${efficiency >= 80 ? 'text-green-600' : efficiency >= 60 ? 'text-blue-600' : 'text-orange-600'}`}>
                    {efficiency.toFixed(1)}%
                </span>
            }
        }
    ]

    // Prepare reception data with efficiency calculation
    const receptionData = [...playerStats]
        .map(p => ({
            ...p,
            receptions: (p as any).receptions || 0,
            receptionEfficiency: (p as any).receptions > 0
                ? ((((p as any).receptions - p.errors.reception) / (p as any).receptions) * 100)
                : 0
        }))
        .filter(p => p.receptions > 0) // Only show players with receptions
        .sort((a, b) => b.receptions - a.receptions)

    return (
        <div className="space-y-8">
            {/* Team KPIs (only for single team) */}
            {teamId && <TeamKPICards kpis={kpis} loading={loading} />}

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

            {/* Rankings Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RankingTable
                    title="Ranking de Puntos"
                    columns={pointsColumns}
                    data={pointsData}
                />
                <RankingTable
                    title="Ranking de Errores"
                    columns={errorsColumns}
                    data={errorsData}
                />
                <RankingTable
                    title="Ranking de Volumen"
                    columns={volumeColumns}
                    data={volumeData}
                />
                <RankingTable
                    title="Ranking Ratio Pts/Err"
                    columns={ratioColumns}
                    data={ratioData}
                />
                <RankingTable
                    title="Ranking de Recepción"
                    columns={receptionColumns}
                    data={receptionData}
                />
            </div>

            {/* Serve Efficiency and Position Stats (only for single team) */}
            {teamId && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ServeEfficiencyTable data={serveEfficiency} />
                    <PositionAggregationTable data={positionStats} />
                </div>
            )}

            {/* Evolution Chart (only for single team) */}
            {teamId && <TeamStatsEvolution data={evolutionData} />}
        </div>
    )
}
