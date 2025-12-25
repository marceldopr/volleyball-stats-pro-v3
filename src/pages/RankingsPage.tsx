import { useState, useEffect, useMemo } from 'react'
import { RankingTable, RankingColumn } from '@/components/dashboard/RankingTable'
import { rankingService, PlayerRankingStats } from '@/services/rankingService'
import { useAuthStore } from '@/stores/authStore'
import { seasonService } from '@/services/seasonService'
import { teamService } from '@/services/teamService'
import { Loader2, Filter, Trophy, Target, Shield, HandMetal, Zap } from 'lucide-react'
import { StatsNavigation } from '@/components/stats/StatsNavigation'

export function RankingsPage() {
    const { profile } = useAuthStore()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<PlayerRankingStats[]>([])
    const [seasons, setSeasons] = useState<any[]>([])
    const [selectedSeasonId, setSelectedSeasonId] = useState<string>('')
    const [selectedTeamId, setSelectedTeamId] = useState<string>('all')
    const [teams, setTeams] = useState<any[]>([])

    // Active Tab: 'points', 'serve', 'attack', 'block', 'reception'
    const [activeTab, setActiveTab] = useState('points')

    useEffect(() => {
        async function loadFilters() {
            if (!profile?.club_id) return
            try {
                const [availableSeasons, clubTeams] = await Promise.all([
                    seasonService.getSeasonsByClub(profile.club_id),
                    teamService.getTeamsByClub(profile.club_id)
                ])
                setSeasons(availableSeasons)
                setTeams(clubTeams)

                // Set default season (current)
                const current = availableSeasons.find(s => s.is_current)
                if (current) setSelectedSeasonId(current.id)
                else if (availableSeasons.length > 0) setSelectedSeasonId(availableSeasons[0].id)

            } catch (err) {
                console.error('Error loading filters', err)
            }
        }
        loadFilters()
    }, [profile?.club_id])

    useEffect(() => {
        async function fetchRankings() {
            if (!profile?.club_id || !selectedSeasonId) return

            setLoading(true)
            try {
                const data = await rankingService.getRankings({
                    clubId: profile.club_id,
                    seasonId: selectedSeasonId,
                    teamId: selectedTeamId === 'all' ? undefined : selectedTeamId
                })
                setStats(data)
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }
        fetchRankings()
    }, [profile?.club_id, selectedSeasonId, selectedTeamId])

    const sortedData = useMemo(() => {
        let data = [...stats]

        switch (activeTab) {
            case 'points':
                return data.sort((a, b) => b.totalPoints - a.totalPoints)
            case 'serve':
                return data.sort((a, b) => b.serveAces - a.serveAces)
            case 'attack':
                return data.sort((a, b) => b.attackKills - a.attackKills)
            case 'block':
                return data.sort((a, b) => b.blockPoints - a.blockPoints)
            case 'reception':
                // For reception, sort by efficiency (descending) but filter out low attempts
                return data
                    .filter(p => p.receptionAttempts > 5) // Minimum threshold
                    .sort((a, b) => b.receptionEfficiency - a.receptionEfficiency)
            default:
                return data
        }
    }, [stats, activeTab])

    const getColumns = (): RankingColumn[] => {
        const baseCols: RankingColumn[] = [
            { key: 'playerName', label: 'Jugadora' },
            { key: 'teamName', label: 'Equipo' },
            { key: 'matchesCaught', label: 'Partidos', align: 'center' },
            { key: 'setsPlayed', label: 'Sets', align: 'center' }
        ]

        switch (activeTab) {
            case 'points':
                return [
                    ...baseCols,
                    { key: 'totalPoints', label: 'Total Puntos', align: 'center', format: (v) => <span className="font-bold">{v}</span> },
                    { key: 'pointsPerSet', label: 'Pts/Set', align: 'center' }
                ]
            case 'serve':
                return [
                    ...baseCols,
                    { key: 'serveAces', label: 'Aces', align: 'center', format: (v) => <span className="font-bold text-emerald-600">{v}</span> },
                    { key: 'serveErrors', label: 'Errores', align: 'center', format: (v) => <span className="text-red-500">{v}</span> },
                    { key: 'serveEfficiency', label: 'Eficacia', align: 'center', format: (v) => `${(v * 100).toFixed(0)}%` }
                ]
            case 'attack':
                return [
                    ...baseCols,
                    { key: 'attackKills', label: 'Puntos', align: 'center', format: (v) => <span className="font-bold text-blue-600">{v}</span> },
                    { key: 'attackErrors', label: 'Errores', align: 'center', format: (v) => <span className="text-red-500">{v}</span> },
                    { key: 'attackKillColors', label: '% Puntos', align: 'center', format: (v) => `${(v * 100).toFixed(0)}%` },
                    { key: 'attackEfficiency', label: 'Eficacia', align: 'center', format: (v) => <span className="font-mono">{(v).toFixed(3)}</span> }
                ]
            case 'block':
                return [
                    ...baseCols,
                    { key: 'blockPoints', label: 'Bloqueos', align: 'center', format: (v) => <span className="font-bold text-purple-600 text-lg">{v}</span> },
                    { key: 'pointsPerSet', label: 'Bloq/Set', align: 'center', format: (_, row) => (row.blockPoints / (row.setsPlayed || 1)).toFixed(2) }
                ]
            case 'reception':
                return [
                    ...baseCols,
                    { key: 'receptionAttempts', label: 'Intentos', align: 'center' },
                    { key: 'receptionErrors', label: 'Errores', align: 'center', format: (v) => <span className="text-red-500">{v}</span> },
                    { key: 'receptionEfficiency', label: 'Positiva %', align: 'center', format: (v) => <span className="font-bold text-emerald-600">{(v * 100).toFixed(0)}%</span> }
                ]
            default: return baseCols
        }
    }

    const tabs = [
        { id: 'points', label: 'Máximas Anotadoras', icon: Trophy },
        { id: 'serve', label: 'Saque', icon: Zap },
        { id: 'attack', label: 'Ataque', icon: Target },
        { id: 'block', label: 'Bloqueo', icon: HandMetal }, // Best icon for block/stop
        { id: 'reception', label: 'Recepción', icon: Shield },
    ]

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                <StatsNavigation />
            </div>

            {/* Sticky Header with Filters */}
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Trophy className="w-7 h-7 text-primary-500" />
                                Rànquings del Club
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Top performers per categoria estadística
                            </p>
                        </div>

                        {/* Filters Bar */}
                        <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/50 p-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="relative">
                                <Filter className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
                                <select
                                    value={selectedSeasonId}
                                    onChange={(e) => setSelectedSeasonId(e.target.value)}
                                    className="pl-8 pr-3 py-1 bg-transparent border-none text-sm font-medium focus:ring-0 text-gray-900 dark:text-gray-100 cursor-pointer"
                                >
                                    {seasons.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="h-5 w-px bg-gray-300 dark:bg-gray-600"></div>

                            <select
                                value={selectedTeamId}
                                onChange={(e) => setSelectedTeamId(e.target.value)}
                                className="py-1 bg-transparent border-none text-sm font-medium focus:ring-0 text-gray-900 dark:text-gray-100 cursor-pointer"
                            >
                                <option value="all">Tots els equips</option>
                                {teams.map(t => (
                                    <option key={t.id} value={t.id}>{t.custom_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Tabs embedded in header for better UX */}
                    <div className="flex flex-wrap gap-2 mt-6">
                        {tabs.map(tab => {
                            const isActive = activeTab === tab.id
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                                        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                                        ${isActive
                                            ? 'bg-primary-500 text-white shadow-md'
                                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'}
                                    `}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {loading ? (
                    <div className="h-96 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                    </div>
                ) : (
                    <RankingTable
                        title={`Top ${stats.length > 50 ? '50' : stats.length} - ${tabs.find(t => t.id === activeTab)?.label}`}
                        columns={getColumns()}
                        data={sortedData}
                    />
                )}
            </div>
        </div>
    )
}

