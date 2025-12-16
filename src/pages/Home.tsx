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
import { getTeamDisplayName } from '@/utils/teamDisplay';
import { TeamIdentifierDot } from '@/components/teams/TeamIdentifierDot';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { CreateTrainingModal } from '@/components/trainings/CreateTrainingModal';
import { Button } from '@/components/ui/Button';
import { ClubHomeView } from '@/components/dashboard/ClubHomeView';

type HomeTab = 'club' | string; // 'club' or teamId

export function Home() {
    const navigate = useNavigate()
    const { profile } = useAuthStore()
    const { isDT, isCoach, assignedTeamIds, loading: roleLoading } = useRoleScope()

    const [teams, setTeams] = useState<TeamDB[]>([])
    const [activeTab, setActiveTab] = useState<HomeTab>('club'); // Default to club view

    const [summary, setSummary] = useState<TeamHomeSummary | null>(null)
    const [loading, setLoading] = useState(true)
    const [loadingSummary, setLoadingSummary] = useState(false)

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Load teams and set initial tab - wait for role data to be ready
    useEffect(() => {
        async function loadTeams() {
            // Wait until role loading is complete before fetching
            if (roleLoading || !profile?.club_id) return

            try {
                setLoading(true)
                let loadedTeams: TeamDB[] = []

                if (isDT) {
                    // DT sees all teams
                    loadedTeams = await teamService.getTeamsByClub(profile.club_id)
                    // Set default tab for DT if not already set (e.g., from URL param)
                    if (activeTab === null) { // Check if it's still null, otherwise 'club' is already set
                        setActiveTab('club')
                    }
                } else if (isCoach && assignedTeamIds.length > 0) {
                    // Coach sees only assigned teams
                    loadedTeams = await teamService.getTeamsByIds(assignedTeamIds)
                    // Set default tab for Coach if not already set
                    if (activeTab === null && loadedTeams.length > 0) {
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
    }, [profile?.club_id, isDT, isCoach, assignedTeamIds, roleLoading, activeTab]) // Added activeTab to dependencies to re-evaluate initial tab setting

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
                            onClick={() => setIsCreateModalOpen(true)}
                        >
                            Crear entrenamiento
                        </Button>
                        <Button
                            variant="secondary"
                            size="md"
                            icon={Plus}
                            onClick={() => navigate('/matches/create-v2')}
                        >
                            Crear partido
                        </Button>
                    </>
                }
            />

            <CreateTrainingModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                activeTeamId={activeTab}
                availableTeams={teams}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="space-y-6">
                    {/* Tabs - Smooth scroll with fade indicators */}
                    <div className="relative border-b border-gray-200 dark:border-gray-700">
                        {/* Fade indicators */}
                        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-50 dark:from-gray-900 to-transparent pointer-events-none z-10" />
                        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-50 dark:from-gray-900 to-transparent pointer-events-none z-10" />

                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide scroll-smooth">
                            {/* Club Tab (Only for DT) */}
                            {isDT && (
                                <button
                                    onClick={() => setActiveTab('club')}
                                    className={cn(
                                        "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 whitespace-nowrap flex-shrink-0",
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
                                        "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap flex items-center gap-1.5 flex-shrink-0",
                                        activeTab === team.id
                                            ? "bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 border-b-2 border-primary-500"
                                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                    )}
                                >
                                    <TeamIdentifierDot identifier={team.identifier} size="sm" />
                                    {getTeamDisplayName(team)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Club View Content */}
                    {activeTab === 'club' && isDT && (
                        <ClubHomeView />
                    )}

                    {/* Team View Content */}
                    {activeTab !== 'club' && activeTab && (
                        <>
                            {/* Quick Actions - Only for non-DT roles (DT uses header buttons) */}
                            {!isDT && (
                                <div className="flex flex-wrap gap-3">
                                    <Button
                                        variant="primary"
                                        size="md"
                                        icon={Activity}
                                        disabled={!activeTab}
                                        onClick={() => setIsCreateModalOpen(true)}
                                    >
                                        Crear entrenamiento
                                    </Button>

                                    <Button
                                        variant="secondary"
                                        size="md"
                                        icon={Trophy}
                                        disabled={!activeTab}
                                        onClick={() => activeTab && navigate(`/matches/create-v2?teamId=${activeTab}`)}
                                    >
                                        Crear partido
                                    </Button>
                                </div>
                            )}

                            {/* Content Area */}
                            {loadingSummary ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
                                    <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
                                    <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
                                </div>
                            ) : !summary ? (
                                <div className="text-center py-12">
                                    <p className="text-gray-500 dark:text-gray-400">No se pudieron cargar los datos del equipo</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Row 1: Estado del equipo + Próximo evento */}
                                    <div className="grid gap-6 md:grid-cols-2">
                                        {/* Estado del equipo - Enhanced */}
                                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                                <Activity className="w-5 h-5 text-primary-500" />
                                                Estado del equipo
                                            </h3>
                                            <div className="space-y-3">
                                                {/* Attendance */}
                                                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                                                    <span className="text-gray-600 dark:text-gray-400">Asistencia (30d)</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn("font-semibold",
                                                            summary?.attendance === null ? "text-gray-400" :
                                                                summary!.attendance >= 80 ? "text-emerald-600" :
                                                                    summary!.attendance >= 70 ? "text-amber-600" :
                                                                        "text-red-600"
                                                        )}>
                                                            {summary?.attendance !== null ? `${summary!.attendance}%` : 'Sin datos'}
                                                        </span>
                                                        {summary?.attendance !== null && (
                                                            <span className="text-lg">
                                                                {summary!.attendance >= 80 ? '🟢' : summary!.attendance >= 70 ? '🟠' : '🔴'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Active players */}
                                                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                                                    <span className="text-gray-600 dark:text-gray-400">Jugadoras activas</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn("font-semibold",
                                                            (summary?.rosterCount || 0) >= 12 ? "text-emerald-600" :
                                                                (summary?.rosterCount || 0) >= 9 ? "text-amber-600" :
                                                                    "text-red-600"
                                                        )}>
                                                            {summary?.rosterCount || 0}
                                                        </span>
                                                        <span className="text-lg">
                                                            {(summary?.rosterCount || 0) >= 12 ? '🟢' : (summary?.rosterCount || 0) >= 9 ? '🟠' : '🔴'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Last activity */}
                                                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                                                    <span className="text-gray-600 dark:text-gray-400">Último entrenamiento</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn("font-semibold",
                                                            summary?.lastActivityDays === null || summary?.lastActivityDays === undefined ? "text-gray-400" :
                                                                summary!.lastActivityDays <= 3 ? "text-emerald-600" :
                                                                    summary!.lastActivityDays <= 7 ? "text-amber-600" :
                                                                        "text-red-600"
                                                        )}>
                                                            {summary?.lastActivityDays === null || summary?.lastActivityDays === undefined ? 'Sin datos' :
                                                                summary!.lastActivityDays === 0 ? 'Hoy' :
                                                                    `hace ${summary!.lastActivityDays} día${summary!.lastActivityDays !== 1 ? 's' : ''}`}
                                                        </span>
                                                        {summary?.lastActivityDays !== null && summary?.lastActivityDays !== undefined && (
                                                            <span className="text-lg">
                                                                {summary!.lastActivityDays <= 3 ? '🟢' : summary!.lastActivityDays <= 7 ? '🟠' : '🔴'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Próximo evento */}
                                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                                <Calendar className="w-5 h-5 text-blue-500" />
                                                Próximo evento
                                            </h3>
                                            {summary?.nextEvent ? (
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white text-lg">
                                                        {summary!.nextEvent.type === 'training' ? 'Entrenamiento' : 'Partido'}
                                                    </p>
                                                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                                                        {summary!.nextEvent.label.split(' - ').slice(1).join(' - ')}
                                                    </p>
                                                </div>
                                            ) : (
                                                <p className="text-gray-500 dark:text-gray-400">Sin eventos programados</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Row 2: Plantilla + Alertas */}
                                    <div className="grid gap-6 md:grid-cols-2">
                                        {/* Plantilla y disponibilidad */}
                                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                                <Users className="w-5 h-5 text-purple-500" />
                                                Plantilla
                                            </h3>
                                            <div className="space-y-2">
                                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                                    {summary?.rosterCount || 0} jugadoras
                                                </p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {summary?.availableCount || 0} disponibles · {summary?.unavailableCount || 0} no disponibles
                                                </p>
                                                {(summary?.injuryCount || 0) > 0 && (
                                                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                                                        <span>⚠️</span>
                                                        {summary?.injuryCount} lesión{summary?.injuryCount !== 1 ? 'es' : ''} activa{summary?.injuryCount !== 1 ? 's' : ''}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Alertas del equipo */}
                                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
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
                                                <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                                    <span>🟢</span>
                                                    Sin alertas por ahora
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Row 3: Actividad reciente */}
                                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                            <ClipboardList className="w-5 h-5 text-green-500" />
                                            Actividad reciente
                                        </h3>
                                        <div className="space-y-2 text-sm">
                                            {summary?.recentActivity?.lastTraining && (
                                                <p className="text-gray-700 dark:text-gray-300">
                                                    <span className="font-medium">Entrenamiento confirmado</span> · {' '}
                                                    {new Date(summary.recentActivity.lastTraining.date).toLocaleDateString('es-ES', {
                                                        day: 'numeric',
                                                        month: 'long'
                                                    })}
                                                </p>
                                            )}
                                            {summary?.recentActivity?.lastMatch && (
                                                <p className="text-gray-700 dark:text-gray-300">
                                                    <span className="font-medium">Último partido</span> · {' '}
                                                    {new Date(summary.recentActivity.lastMatch.date).toLocaleDateString('es-ES', {
                                                        day: 'numeric',
                                                        month: 'long'
                                                    })}
                                                </p>
                                            )}
                                            {!summary?.recentActivity?.lastTraining && !summary?.recentActivity?.lastMatch && (
                                                <p className="text-gray-400 dark:text-gray-500 italic">
                                                    Sin actividad reciente registrada
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
