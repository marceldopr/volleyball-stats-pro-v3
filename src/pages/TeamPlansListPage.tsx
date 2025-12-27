import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Calendar, CheckCircle, XCircle, ChevronRight, Search, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole'
import { teamService, TeamDB } from '@/services/teamService'
import { teamSeasonPlanService } from '@/services/teamSeasonPlanService'
import { seasonService } from '@/services/seasonService'
import { getTeamDisplayName } from '@/utils/teamDisplay'
import { toast } from 'sonner'

export function TeamPlansListPage() {
    const navigate = useNavigate()
    const { profile } = useAuthStore()
    const { isDT, isCoach, assignedTeamIds } = useCurrentUserRole()

    const [loading, setLoading] = useState(true)
    const [teams, setTeams] = useState<TeamDB[]>([])
    const [plansMap, setPlansMap] = useState<Record<string, any>>({})
    const [currentSeason, setCurrentSeason] = useState<any>(null)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        const fetchData = async () => {
            if (!profile?.club_id) return

            try {
                setLoading(true)

                // 1. Get current season
                let season = null
                try {
                    season = await seasonService.getCurrentSeasonByClub(profile.club_id)
                } catch (error) {
                    const allSeasons = await seasonService.getSeasonsByClub(profile.club_id)
                    if (allSeasons && allSeasons.length > 0) {
                        season = allSeasons.sort((a, b) => {
                            const dateA = new Date(a.start_date || a.reference_date)
                            const dateB = new Date(b.start_date || b.reference_date)
                            return dateB.getTime() - dateA.getTime()
                        })[0]
                    }
                }

                if (!season) {
                    setLoading(false)
                    return
                }
                setCurrentSeason(season)

                // 2. Get teams
                let teamsData = await teamService.getTeamsByClubAndSeason(profile.club_id, season.id)

                // Filter for coaches
                if (isCoach && !isDT) {
                    teamsData = teamsData.filter(t => assignedTeamIds.includes(t.id))
                }

                setTeams(teamsData)

                // 3. Get all plans for this season
                const plans = await teamSeasonPlanService.getPlansByClubSeason(profile.club_id, season.id)

                // Create a map for easy lookup: team_id -> plan
                const map: Record<string, any> = {}
                plans.forEach(plan => {
                    map[plan.team_id] = plan
                })
                setPlansMap(map)

            } catch (error) {
                console.error('Error fetching data:', error)
                toast.error('Error al cargar los datos')
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [profile?.club_id, isDT, isCoach, assignedTeamIds])

    const filteredTeams = teams.filter(team =>
        (team.custom_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.category_stage.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Cargando planificaciones...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="sm" onClick={() => navigate('/reports')} className="mr-2">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <FileText className="w-8 h-8 text-primary-600" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Planificación de Equipos
                                </h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Temporada {currentSeason?.name}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Search Bar */}
                <div className="p-4 mb-4 bg-slate-700/30 dark:bg-slate-900/50 rounded-lg border border-gray-600/30">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Buscar equipo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-600 dark:border-gray-600 rounded-lg bg-gray-800/50 text-gray-100 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {filteredTeams.length === 0 ? (
                    <div className="text-center py-12 bg-gray-800/30 rounded-lg border border-gray-700/50">
                        <FileText className="w-16 h-16 text-gray-500 dark:text-gray-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-200 dark:text-white mb-2">
                            No se encontraron equipos
                        </h3>
                        <p className="text-gray-400 dark:text-gray-400">
                            {searchTerm ? 'Intenta con otra búsqueda' : 'No hay equipos disponibles para esta temporada'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto bg-gray-800/20 rounded-lg border border-gray-700/50">
                        <table className="min-w-full divide-y divide-slate-700/50 dark:divide-gray-700">
                            <thead className="bg-gray-800/30 dark:bg-gray-900/30">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                                        Equipo
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                                        Categoría
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                                        Estado
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                                        Última Actualización
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                                        Acción
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-gray-800/20 divide-y divide-gray-700/30">
                                {filteredTeams.map((team) => {
                                    const plan = plansMap[team.id]
                                    return (
                                        <tr
                                            key={team.id}
                                            className="hover:bg-slate-700/30 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                                            onClick={() => navigate(`/reports/team-plan/${team.id}`)}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-100 dark:text-white">
                                                    {getTeamDisplayName(team)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300 dark:bg-gray-700 dark:text-gray-300">
                                                    {team.category_stage}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                {plan ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-200 dark:bg-green-900 dark:text-green-200">
                                                        <CheckCircle className="w-3 h-3" />
                                                        Planificado
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900 text-yellow-200 dark:bg-yellow-900 dark:text-yellow-200">
                                                        <XCircle className="w-3 h-3" />
                                                        Pendiente
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 dark:text-gray-400">
                                                {plan ? (
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {formatDate(plan.updated_at)}
                                                    </div>
                                                ) : (
                                                    '-'
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button className="text-emerald-400 hover:text-emerald-300 dark:text-emerald-400 dark:hover:text-emerald-300">
                                                    <ChevronRight className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

