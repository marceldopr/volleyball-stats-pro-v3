import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Users, Target, FileText, Trophy, BarChart3, ArrowLeft, Loader2, Home, BookOpen, Edit, Trash2, MoreVertical } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { teamService, TeamDB } from '@/services/teamService'
import { seasonService, SeasonDB } from '@/services/seasonService'
import { TeamHomePage } from '@/pages/TeamHomePage'
import { TeamRosterManager } from '@/components/teams/TeamRosterManager'
import { TeamSeasonContext } from '@/pages/TeamSeasonContext'
import { TeamSeasonPlanPage } from '@/pages/TeamSeasonPlanPage'
import { Matches } from '@/pages/Matches'
import { TeamStatsTab } from '@/components/dashboard/TeamStatsTab'
import { getTeamDisplayName } from '@/utils/teamDisplay'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import { clsx } from 'clsx'
import { useRoleScope } from '@/hooks/useRoleScope'

type TabId = 'home' | 'roster' | 'context' | 'planning' | 'matches' | 'stats'

export function TeamDashboardPage() {
    const { teamId } = useParams<{ teamId: string }>()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const { profile } = useAuthStore()

    const activeTab = (searchParams.get('tab') as TabId) || 'home'

    const setActiveTab = (tab: TabId) => {
        setSearchParams({ tab })
    }

    const [team, setTeam] = useState<TeamDB | null>(null)
    const [currentSeason, setCurrentSeason] = useState<SeasonDB | null>(null)
    const [loading, setLoading] = useState(true)
    const [showActionsMenu, setShowActionsMenu] = useState(false)
    const { isDT } = useRoleScope()

    useEffect(() => {
        const loadData = async () => {
            if (!teamId || !profile?.club_id) return

            try {
                setLoading(true)
                const [teamData, seasonData] = await Promise.all([
                    teamService.getTeamById(teamId),
                    seasonService.getCurrentSeasonByClub(profile.club_id)
                ])

                setTeam(teamData)
                setCurrentSeason(seasonData)
            } catch (error) {
                console.error('Error loading team dashboard:', error)
                toast.error('Error al cargar los datos del equipo')
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [teamId, profile?.club_id])

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
                <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
            </div>
        )
    }

    if (!team || !currentSeason) {
        return (
            <div className="p-6 text-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Equipo no encontrado</h2>
                <Button
                    variant="primary"
                    size="md"
                    onClick={() => navigate('/teams')}
                    className="mt-4"
                >
                    Volver a Mis Equipos
                </Button>
            </div>
        )
    }

    const tabs = [
        { id: 'home', label: 'Inicio', icon: Home },
        { id: 'roster', label: 'Plantilla', icon: Users },
        { id: 'context', label: 'Contexto', icon: Target },
        { id: 'planning', label: 'Planificación', icon: FileText },
        { id: 'matches', label: 'Partidos', icon: Trophy },
        { id: 'stats', label: 'Estadísticas', icon: BarChart3 },
    ]

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="py-4 flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            icon={ArrowLeft}
                            onClick={() => navigate('/teams')}
                            className="p-2"
                        >
                            {''}
                        </Button>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                {getTeamDisplayName(team)}
                                <span className="text-sm font-normal text-gray-500 dark:text-gray-400 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                                    {team.category_stage}
                                </span>
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Temporada {currentSeason.name}
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                            {/* Season Summary Button */}
                            <Button
                                variant="secondary"
                                size="sm"
                                icon={BookOpen}
                                onClick={() => navigate(`/teams/${team.id}/season/${currentSeason.id}/summary`)}
                                title="Resumen de Temporada"
                            >
                                <span className="hidden sm:inline">Resumen</span>
                            </Button>

                            {/* Admin Actions (Edit/Delete) - Only for DT */}
                            {isDT && (
                                <div className="relative">
                                    <button
                                        onClick={() => setShowActionsMenu(!showActionsMenu)}
                                        className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                        title="Más acciones"
                                    >
                                        <MoreVertical className="w-5 h-5" />
                                    </button>

                                    {showActionsMenu && (
                                        <>
                                            {/* Backdrop to close menu */}
                                            <div
                                                className="fixed inset-0 z-10"
                                                onClick={() => setShowActionsMenu(false)}
                                            />

                                            {/* Actions Menu */}
                                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                                                <button
                                                    onClick={() => {
                                                        setShowActionsMenu(false)
                                                        toast.info('Función de edición en desarrollo')
                                                    }}
                                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                    Editar equipo
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setShowActionsMenu(false)
                                                        toast.info('Función de eliminación en desarrollo')
                                                    }}
                                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Eliminar equipo
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex space-x-1 overflow-x-auto no-scrollbar mt-2">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabId)}
                                className={clsx(
                                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                                    activeTab === tab.id
                                        ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                )}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {activeTab === 'home' && (
                    <TeamHomePage />
                )}

                {activeTab === 'roster' && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <TeamRosterManager
                            team={team}
                            season={currentSeason}
                            onClose={() => { }} // No-op as it's not a modal here
                        />
                    </div>
                )}

                {activeTab === 'context' && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="[&>div>div:first-child]:hidden">
                            <TeamSeasonContext />
                        </div>
                    </div>
                )}

                {activeTab === 'planning' && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="[&>div>div:first-child]:hidden">
                            <TeamSeasonPlanPage />
                        </div>
                    </div>
                )}

                {activeTab === 'matches' && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="[&>div>div:first-child]:hidden">
                            <Matches teamId={team.id} />
                        </div>
                    </div>
                )}

                {activeTab === 'stats' && (
                    <TeamStatsTab teamId={team.id} seasonId={currentSeason.id} />
                )}
            </div>
        </div>
    )
}
