import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    Calendar,
    Trophy,
    AlertTriangle,
    Activity,
    ClipboardList,
    Building2,
    Plus,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useRoleScope } from '@/hooks/useRoleScope';
import { teamService, TeamDB } from '@/services/teamService';
import { teamStatsService, TeamHomeSummary } from '@/services/teamStatsService';
import { clubStatsService, ClubOverviewSummary } from '@/services/clubStatsService';
import { getTeamDisplayName } from '@/utils/teamDisplay';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { CreateTrainingModal } from '@/components/trainings/CreateTrainingModal';
import { Button } from '@/components/ui/Button';

type HomeTab = 'club' | string; // 'club' or teamId

export function Home() {
    const navigate = useNavigate()
    const { profile } = useAuthStore()
    const { isDT, isCoach, assignedTeamIds } = useRoleScope()

    const [teams, setTeams] = useState<TeamDB[]>([])
    const [activeTab, setActiveTab] = useState<HomeTab | null>(null)

    const [summary, setSummary] = useState<TeamHomeSummary | null>(null)
    const [loading, setLoading] = useState(true)
    const [loadingSummary, setLoadingSummary] = useState(false)

    const [clubSummary, setClubSummary] = useState<ClubOverviewSummary | null>(null)
    const [loadingClubSummary, setLoadingClubSummary] = useState(false)
    const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false)

    // Load teams and set initial tab
    useEffect(() => {
        async function loadTeams() {
            if (!profile?.club_id) return

            try {
                setLoading(true)
                let loadedTeams: TeamDB[] = []

                if (isDT) {
                    // DT sees all teams
                    loadedTeams = await teamService.getTeamsByClub(profile.club_id)
                    // Set default tab for DT
                    if (!activeTab) {
                        setActiveTab('club')
                    }
                } else if (isCoach && assignedTeamIds.length > 0) {
                    // Coach sees only assigned teams
                    loadedTeams = await teamService.getTeamsByIds(assignedTeamIds)
                    // Set default tab for Coach
                    if (!activeTab && loadedTeams.length > 0) {
                        setActiveTab(loadedTeams[0].id)
                    }
                }

                setTeams(loadedTeams)
            } catch (error) {
                console.error('Error loading teams:', error)
                toast.error('Error al cargar los equipos')
            } finally {
                setLoading(false)
            }
        }

        loadTeams()
    }, [profile?.club_id, isDT, isCoach, assignedTeamIds])

    // Load team summary when activeTab is a team ID
    useEffect(() => {
        async function loadTeamSummary() {
            if (!activeTab || activeTab === 'club') {
                setSummary(null)
                return
            }

            try {
                setLoadingSummary(true)
                const data = await teamStatsService.getTeamHomeSummary(activeTab)
                setSummary(data)
            } catch (error) {
                console.error('Error loading team summary:', error)
            } finally {
                setLoadingSummary(false)
            }
        }

        loadTeamSummary()
    }, [activeTab])

    // Load club summary when activeTab is 'club'
    useEffect(() => {
        async function loadClubSummary() {
            if (!isDT || activeTab !== 'club' || !profile?.club_id) {
                setClubSummary(null)
                return
            }

            try {
                setLoadingClubSummary(true)
                const data = await clubStatsService.getOverview(profile.club_id)
                setClubSummary(data)
            } catch (error) {
                console.error('Error loading club summary:', error)
                toast.error('Error al cargar el resumen del club')
            } finally {
                setLoadingClubSummary(false)
            }
        }

        loadClubSummary()
    }, [activeTab, isDT, profile?.club_id])

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    if (teams.length === 0 && !isDT) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-center px-4">
                <Users className="w-16 h-16 text-gray-300 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    No tienes equipos asignados
                </h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-md">
                    Contacta con la dirección técnica para que te asignen un equipo.
                </p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-900">
            <PageHeader
                title="Inicio del Club"
                subtitle="Gestión global de equipos, entrenadores y estadísticas del club."
                actions={
                    <>

                        <Button
                            variant="primary"
                            size="md"
                            icon={Plus}
                            onClick={() => setIsTrainingModalOpen(true)}
                        >
                            Crear entrenamiento
                        </Button>
                        <Button
                            variant="secondary"
                            size="md"
                            icon={Plus}
                        >
                            Crear partido
                        </Button>
                    </>
                }
            />

            <CreateTrainingModal
                isOpen={isTrainingModalOpen}
                onClose={() => setIsTrainingModalOpen(false)}
                activeTeamId={activeTab}
                availableTeams={teams}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="space-y-6">
                    {/* Tabs */}
                    <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto pb-1">
                        {/* Club Tab (Only for DT) */}
                        {isDT && (
                            <button
                                onClick={() => setActiveTab('club')}
                                className={cn(
                                    "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 whitespace-nowrap",
                                    activeTab === 'club'
                                        ? "bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 border-b-2 border-primary-500"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                )}
                            >
                                <Building2 className="w-4 h-4" />
                                Club
                            </button>
                        )}

                        {/* Team Tabs */}
                        {teams.map((team) => (
                            <button
                                key={team.id}
                                onClick={() => setActiveTab(team.id)}
                                className={cn(
                                    "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap",
                                    activeTab === team.id
                                        ? "bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 border-b-2 border-primary-500"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                )}
                            >
                                {getTeamDisplayName(team)}
                            </button>
                        ))}
                    </div>

                    {/* Club View Content */}
                    {activeTab === 'club' && isDT && (
                        <>
                            {loadingClubSummary ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
                                    <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
                                    <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
                                    <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
                                    <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* KPIs generales */}
                                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                                            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                                Asistencia global
                                            </h3>
                                            <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                                {clubSummary?.attendanceGlobal !== null ? `${clubSummary?.attendanceGlobal}%` : '--'}
                                            </p>
                                        </div>
                                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                                            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                                Ratio victorias/derrotas
                                            </h3>
                                            <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                                {clubSummary?.winLossRatio ?? '--'}
                                            </p>
                                        </div>
                                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                                            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                                Entrenamientos registrados
                                            </h3>
                                            <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                                {clubSummary?.totalTrainings ?? 0}
                                            </p>
                                        </div>
                                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                                            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                                Informes completados
                                            </h3>
                                            <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                                {clubSummary
                                                    ? `${clubSummary.completedReports}/${clubSummary.totalReportsExpected}`
                                                    : '--'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Categorías */}
                                    <div
                                        onClick={() => navigate('/club/dashboard')}
                                        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow group"
                                    >
                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                            <Trophy className="w-5 h-5 text-primary-500" />
                                            Categorías
                                        </h3>
                                        {clubSummary?.categories && clubSummary.categories.length > 0 ? (
                                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                                {clubSummary.categories.map((cat) => (
                                                    <div
                                                        key={cat.id}
                                                        className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                                    >
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="font-medium text-gray-900 dark:text-white">
                                                                {cat.name}
                                                            </span>
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                    {cat.teamsCount} equipo{cat.teamsCount !== 1 ? 's' : ''}
                                                                </span>
                                                                {cat.riskLevel === 'high' && <span className="text-lg">⚠️</span>}
                                                                {cat.riskLevel === 'medium' && <span className="text-lg">🟡</span>}
                                                                {cat.riskLevel === 'low' && <span className="text-lg">🟢</span>}
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                                            Asistencia: {cat.attendance ?? '--'}% · Ratio V/D: {cat.winLossRatio ?? '--'}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                No hay categorías configuradas.
                                            </p>
                                        )}
                                    </div>

                                    {/* Entrenadores */}
                                    <div
                                        onClick={() => navigate('/reports/coaches')}
                                        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow group"
                                    >
                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                            <Users className="w-5 h-5 text-blue-500" />
                                            Entrenadores
                                        </h3>
                                        {clubSummary?.coaches && clubSummary.coaches.length > 0 ? (
                                            <div className="space-y-2">
                                                {clubSummary.coaches.map((coach) => (
                                                    <div
                                                        key={coach.id}
                                                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                                    >
                                                        <div>
                                                            <span className="font-medium text-gray-900 dark:text-white">
                                                                {coach.name}
                                                            </span>
                                                            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                                                                · {coach.teamsCount} equipo{coach.teamsCount !== 1 ? 's' : ''}
                                                            </span>
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                                            {coach.reportsCompletion ?? '--'}% informes
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                No hay entrenadores asignados.
                                            </p>
                                        )}
                                    </div>

                                    {/* Alertas */}
                                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                                            Alertas del club
                                        </h3>
                                        {clubSummary?.alerts && clubSummary.alerts.length > 0 ? (
                                            <ul className="space-y-2">
                                                {clubSummary.alerts.map((alert) => (
                                                    <li
                                                        key={alert.id}
                                                        className={cn(
                                                            "flex items-start gap-2 text-sm p-3 rounded-lg border",
                                                            alert.level === 'danger'
                                                                ? "bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-200 border-red-100 dark:border-red-800/30"
                                                                : alert.level === 'warning'
                                                                    ? "bg-amber-50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-200 border-amber-100 dark:border-amber-800/30"
                                                                    : "bg-blue-50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-200 border-blue-100 dark:border-blue-800/30"
                                                        )}
                                                    >
                                                        <span className="mt-0.5">
                                                            {alert.level === 'danger' ? '⚠️' : alert.level === 'warning' ? '🟡' : 'ℹ️'}
                                                        </span>
                                                        <span>{alert.message}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                                <ClipboardList className="w-4 h-4" />
                                                Sin alertas por ahora.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Team View Content */}
                    {activeTab !== 'club' && activeTab && (
                        <>
                            {/* Quick Actions - Only for non-DT roles (DT uses header buttons) */}
                            {!isDT && (
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        disabled={!activeTab}
                                        onClick={() => setIsTrainingModalOpen(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Activity className="w-4 h-4" />
                                        <span>Crear entrenamiento</span>
                                    </button>

                                    <button
                                        disabled={!activeTab}
                                        onClick={() => activeTab && navigate(`/matches/new?teamId=${activeTab}`)}
                                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Trophy className="w-4 h-4" />
                                        <span>Crear partido</span>
                                    </button>
                                </div>
                            )}

                            {/* Content Area */}
                            {loadingSummary ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
                                    <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
                                    <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
                                </div>
                            ) : (
                                <div className="grid gap-6 md:grid-cols-2">
                                    {/* Team Status Card */}
                                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                            <Activity className="w-5 h-5 text-primary-500" />
                                            Estado del equipo
                                        </h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                                                <span className="text-gray-600 dark:text-gray-400">Asistencia (30 días)</span>
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {summary?.attendance !== null ? `${summary?.attendance}%` : '--'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                                                <span className="text-gray-600 dark:text-gray-400">Último partido</span>
                                                <span className="font-medium text-gray-900 dark:text-white truncate max-w-[200px] text-right" title={summary?.lastMatchText || ''}>
                                                    {summary?.lastMatchText || 'Sin datos'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                                                <span className="text-gray-600 dark:text-gray-400">Ratio puntos/errores</span>
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {summary?.pointsErrorRatio ?? '--'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Next Event & Alerts Column */}
                                    <div className="space-y-6">
                                        {/* Next Event */}
                                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                                            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                                <Calendar className="w-5 h-5 text-blue-500" />
                                                Próximo evento
                                            </h3>
                                            {summary?.nextEvent ? (
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white text-lg">
                                                        {summary.nextEvent.label.split(' - ')[0]}
                                                    </p>
                                                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                                                        {summary.nextEvent.label.split(' - ').slice(1).join(' - ')}
                                                    </p>
                                                </div>
                                            ) : (
                                                <p className="text-gray-500 dark:text-gray-400">Sin eventos programados.</p>
                                            )}
                                        </div>

                                        {/* Alerts */}
                                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                                            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                                                Alertas
                                            </h3>
                                            {summary?.alerts && summary.alerts.length > 0 ? (
                                                <ul className="space-y-2">
                                                    {summary.alerts.map((alert) => (
                                                        <li
                                                            key={alert.id}
                                                            className="flex items-start gap-2 text-sm p-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-200 border border-amber-100 dark:border-amber-800/30"
                                                        >
                                                            <span className="mt-0.5">⚠️</span>
                                                            <span>{alert.message}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-sm text-gray-400 dark:text-gray-500 flex items-center gap-2">
                                                    <ClipboardList className="w-4 h-4" />
                                                    Sin alertas por ahora.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
