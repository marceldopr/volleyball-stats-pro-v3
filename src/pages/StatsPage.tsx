import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { teamService, TeamDB } from '@/services/teamService'
import { seasonService, SeasonDB } from '@/services/seasonService'
import { TeamStatsTab } from '@/components/dashboard/TeamStatsTab'
import { getTeamDisplayName } from '@/utils/teamDisplay'
import { toast } from 'sonner'
import { StatsNavigation } from '@/components/stats/StatsNavigation'


export function StatsPage() {
    const { profile } = useAuthStore()
    const navigate = useNavigate()

    const [loading, setLoading] = useState(true)
    const [teams, setTeams] = useState<TeamDB[]>([])
    const [currentSeason, setCurrentSeason] = useState<SeasonDB | null>(null)
    const [selectedTeamId, setSelectedTeamId] = useState<string>('')

    useEffect(() => {
        loadData()
    }, [profile?.club_id])

    const loadData = async () => {
        if (!profile?.club_id) return

        try {
            setLoading(true)
            const [season, teamsData] = await Promise.all([
                seasonService.getCurrentSeasonByClub(profile.club_id),
                teamService.getTeamsByClubAndSeason(profile.club_id, (await seasonService.getCurrentSeasonByClub(profile.club_id))?.id || '')
            ])

            setCurrentSeason(season)
            setTeams(teamsData)

            // Auto-select "all teams" by default
            if (!selectedTeamId) {
                setSelectedTeamId('all')
            }
        } catch (error) {
            console.error('Error loading stats page data:', error)
            toast.error('Error al cargar los datos')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 animate-spin text-primary-500" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Cargando estadísticas...</p>
                </div>
            </div>
        )
    }

    if (!currentSeason) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Estadísticas</h1>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
                        <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-2">No hay temporada activa</h3>
                        <p className="text-yellow-600 dark:text-yellow-300">
                            Necesitas configurar una temporada actual para ver las estadísticas.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    if (teams.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Estadísticas</h1>
                    <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
                        <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No hay equipos</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Crea equipos para ver sus estadísticas.
                        </p>
                        <Button
                            variant="primary"
                            size="md"
                            onClick={() => navigate('/teams')}
                        >
                            Ir a Equipos
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                <StatsNavigation />
            </div>

            {/* Header with team selector */}
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <BarChart3 className="w-7 h-7 text-primary-500" />
                                Estadísticas del Equipo
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Temporada {currentSeason.name}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 w-full sm:w-auto">


                            {/* Team selector */}
                            <select
                                value={selectedTeamId}
                                onChange={(e) => {
                                    if (e.target.value === 'separator') return
                                    setSelectedTeamId(e.target.value)
                                }}
                                className="input w-full sm:w-64 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                            >
                                <option value="all">📊 Todos</option>
                                <option value="separator" disabled>───────────────────</option>
                                {teams.map((team) => (
                                    <option key={team.id} value={team.id}>
                                        {getTeamDisplayName(team)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {selectedTeamId && currentSeason && (
                    <TeamStatsTab
                        teamId={selectedTeamId === 'all' ? undefined : selectedTeamId}
                        teamIds={selectedTeamId === 'all' ? teams.map(t => t.id) : undefined}
                        seasonId={currentSeason.id}
                    />
                )}
            </div>
        </div>
    )
}
