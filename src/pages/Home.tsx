
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    Calendar,
    Trophy,
    AlertTriangle,
    Activity,
    ClipboardList,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useRoleScope } from '@/hooks/useRoleScope';
import { teamService, TeamDB } from '@/services/teamService';
import { teamStatsService, TeamHomeSummary } from '@/services/teamStatsService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function Home() {
    const navigate = useNavigate()
    const { profile } = useAuthStore()
    const { isDT, isCoach, assignedTeamIds } = useRoleScope()

    const [teams, setTeams] = useState<TeamDB[]>([])
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
    const [summary, setSummary] = useState<TeamHomeSummary | null>(null)
    const [loading, setLoading] = useState(true)
    const [loadingSummary, setLoadingSummary] = useState(false)

    // Load teams based on role
    useEffect(() => {
        async function loadTeams() {
            if (!profile?.club_id) return

            try {
                setLoading(true)
                let loadedTeams: TeamDB[] = []

                if (isDT) {
                    // DT sees all teams
                    loadedTeams = await teamService.getTeamsByClub(profile.club_id)
                } else if (isCoach && assignedTeamIds.length > 0) {
                    // Coach sees only assigned teams
                    loadedTeams = await teamService.getTeamsByIds(assignedTeamIds)
                }

                setTeams(loadedTeams)

                // Select first team by default if none selected
                if (loadedTeams.length > 0 && !selectedTeamId) {
                    setSelectedTeamId(loadedTeams[0].id)
                }
            } catch (error) {
                console.error('Error loading teams:', error)
                toast.error('Error al cargar los equipos')
            } finally {
                setLoading(false)
            }
        }

        loadTeams()
    }, [profile?.club_id, isDT, isCoach, assignedTeamIds])

    // Load summary when team changes
    useEffect(() => {
        async function loadSummary() {
            if (!selectedTeamId) {
                setSummary(null)
                return
            }

            try {
                setLoadingSummary(true)
                const data = await teamStatsService.getTeamHomeSummary(selectedTeamId)
                setSummary(data)
            } catch (error) {
                console.error('Error loading team summary:', error)
            } finally {
                setLoadingSummary(false)
            }
        }

        loadSummary()
    }, [selectedTeamId])

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    if (teams.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-center px-4">
                <Users className="w-16 h-16 text-gray-300 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {isDT ? 'No hay equipos configurados' : 'No tienes equipos asignados'}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-md">
                    {isDT
                        ? 'Comienza creando equipos en la sección de Gestión.'
                        : 'Contacta con la dirección técnica para que te asignen un equipo.'}
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header & Team Selector (Tabs) */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Panel de Inicio
                </h1>

                {teams.length > 1 ? (
                    <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto pb-1">
                        {teams.map((team) => (
                            <button
                                key={team.id}
                                onClick={() => setSelectedTeamId(team.id)}
                                className={cn(
                                    "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap",
                                    team.id === selectedTeamId
                                        ? "bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 border-b-2 border-primary-500"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                )}
                            >
                                {team.name}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                            <Users className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {teams[0].name}
                        </h2>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
                <button
                    disabled={!selectedTeamId}
                    onClick={() => selectedTeamId && navigate(`/teams/${selectedTeamId}/trainings/new`)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Activity className="w-4 h-4" />
                    <span>Crear entrenamiento</span>
                </button>

                <button
                    disabled={!selectedTeamId}
                    onClick={() => selectedTeamId && navigate(`/matches/new?teamId=${selectedTeamId}`)}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Trophy className="w-4 h-4" />
                    <span>Crear partido</span>
                </button>
            </div>

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
        </div>
    )
}
