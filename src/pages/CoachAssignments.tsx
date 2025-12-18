import { useState, useEffect } from 'react'
import { Users, UserPlus, X, User, Award } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole'
import { coachAssignmentService, CoachWithAssignments } from '@/services/coachAssignmentService'
import { teamService, TeamDB } from '@/services/teamService'
import { seasonService, SeasonDB } from '@/services/seasonService'
import { toast } from 'sonner'
import { getTeamDisplayName } from '@/utils/teamDisplay'
import { useNavigate } from 'react-router-dom'
import { TeamIdentifierDot } from '@/components/teams/TeamIdentifierDot'
import { clsx } from 'clsx'

export function CoachAssignments() {
    const navigate = useNavigate()
    const { profile } = useAuthStore()
    const { isDT, isAdmin } = useCurrentUserRole()
    const [coaches, setCoaches] = useState<CoachWithAssignments[]>([])
    const [loading, setLoading] = useState(true)
    const [currentSeason, setCurrentSeason] = useState<SeasonDB | null>(null)
    const [availableTeams, setAvailableTeams] = useState<TeamDB[]>([])

    // Assign modal state
    const [showAssignModal, setShowAssignModal] = useState(false)
    const [selectedCoachId, setSelectedCoachId] = useState<string>('')
    const [selectedTeamId, setSelectedTeamId] = useState<string>('')
    const [assigning, setAssigning] = useState(false)

    // Access control
    useEffect(() => {
        if (!isDT && !isAdmin) {
            navigate('/')
            toast.error('No tienes permisos para acceder a esta página')
        }
    }, [isDT, isAdmin, navigate])

    useEffect(() => {
        loadData()
    }, [profile?.club_id])

    const loadData = async () => {
        if (!profile?.club_id) {
            console.warn('[CoachAssignments] No club_id in profile:', profile)
            return
        }

        console.log('[CoachAssignments] Loading data for club:', profile.club_id)
        setLoading(true)
        try {
            // Get current season
            const seasons = await seasonService.getSeasonsByClub(profile.club_id)
            console.log('[CoachAssignments] Seasons found:', seasons.length, seasons.map(s => ({ id: s.id, name: s.name, is_current: s.is_current })))

            const activeSeason = seasons.find(s => s.is_current) || seasons[0]
            setCurrentSeason(activeSeason)

            if (!activeSeason) {
                console.error('[CoachAssignments] No active season found')
                toast.error('No hay temporadas activas')
                setLoading(false)
                return
            }

            console.log('[CoachAssignments] Using season:', { id: activeSeason.id, name: activeSeason.name })

            // Get coaches with assignments
            const coachesData = await coachAssignmentService.getCoachesWithAssignments(
                profile.club_id,
                activeSeason.id
            )
            console.log('[CoachAssignments] Coaches data received:', coachesData.length, coachesData)
            setCoaches(coachesData)

            // Get all teams for assignment dropdown
            const teams = await teamService.getTeamsByClubAndSeason(profile.club_id, activeSeason.id)
            console.log('[CoachAssignments] Teams found:', teams.length)
            setAvailableTeams(teams)
        } catch (error) {
            console.error('[CoachAssignments] Error loading data:', error)
            toast.error('Error al cargar los datos')
        } finally {
            setLoading(false)
        }
    }

    const handleOpenAssignModal = (coachId: string) => {
        setSelectedCoachId(coachId)
        setSelectedTeamId('')
        setShowAssignModal(true)
    }

    const handleAssignTeam = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedCoachId || !selectedTeamId || !currentSeason) return

        setAssigning(true)
        try {
            await coachAssignmentService.assignCoachToTeam({
                user_id: selectedCoachId,
                team_id: selectedTeamId,
                season_id: currentSeason.id
            })
            toast.success('Equipo asignado correctamente')
            setShowAssignModal(false)
            setSelectedCoachId('')
            setSelectedTeamId('')
            loadData()
        } catch (error) {
            console.error('Error assigning team:', error)
            toast.error('Error al asignar el equipo')
        } finally {
            setAssigning(false)
        }
    }

    const handleRemoveAssignment = async (assignmentId: string, coachName: string, teamName: string) => {
        if (!window.confirm(`¿Quitar a ${coachName} del equipo ${teamName}?`)) return

        try {
            await coachAssignmentService.removeCoachAssignment(assignmentId)
            toast.success('Asignación eliminada')
            loadData()
        } catch (error) {
            console.error('Error removing assignment:', error)
            toast.error('Error al eliminar la asignación')
        }
    }

    // Helper: Get role badge info based on coach role and assignments
    const getRoleBadgeInfo = (coach: CoachWithAssignments) => {
        const isDTRole = coach.role === 'dt'
        const hasAssignments = coach.assignments.length > 0

        if (isDTRole && hasAssignments) {
            return {
                label: 'DT + Entrenador',
                className: 'bg-gradient-to-r from-purple-100 to-orange-100 text-purple-800 dark:from-purple-900/40 dark:to-orange-900/40 dark:text-purple-200 border border-purple-200 dark:border-purple-700'
            }
        } else if (isDTRole) {
            return {
                label: 'DT',
                className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200 border border-purple-200 dark:border-purple-700'
            }
        } else {
            return {
                label: 'Entrenador',
                className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 border border-blue-200 dark:border-blue-700'
            }
        }
    }

    // Helper: Get workload badge info based on number of teams
    const getWorkloadBadgeInfo = (teamCount: number) => {
        if (teamCount === 0) {
            return {
                label: '0 equipos',
                className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            }
        } else if (teamCount <= 2) {
            return {
                label: `${teamCount} ${teamCount === 1 ? 'equipo' : 'equipos'}`,
                className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
            }
        } else if (teamCount <= 4) {
            return {
                label: `${teamCount} equipos`,
                className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
            }
        } else {
            return {
                label: `${teamCount} equipos`,
                className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
            }
        }
    }

    // Helper: Get team data for rendering pills
    const getTeamDataForPill = (teamId: string) => {
        const team = availableTeams.find(t => t.id === teamId)
        return team
    }

    // Filter teams that are not already assigned to the selected coach
    const getAvailableTeamsForCoach = (coachId: string) => {
        const coach = coaches.find(c => c.id === coachId)
        if (!coach) return availableTeams

        const assignedTeamIds = coach.assignments.map(a => a.team_id)
        return availableTeams.filter(t => !assignedTeamIds.includes(t.id))
    }

    if (!isDT && !isAdmin) {
        return null
    }

    return (
        <div className="max-w-6xl mx-auto px-6 lg:px-8 pt-6 lg:pt-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Users className="w-6 h-6 text-primary-600" />
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestión de Entrenadores</h1>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Asigna equipos a los entrenadores del club
                    {currentSeason && <span className="text-xs text-gray-400 ml-2">· Temporada: {currentSeason.name}</span>}
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                </div>
            ) : coaches.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">No hay entrenadores</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        No se encontraron entrenadores en este club.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {coaches.map(coach => {
                        const roleBadge = getRoleBadgeInfo(coach)
                        const workloadBadge = getWorkloadBadgeInfo(coach.assignments.length)

                        return (
                            <div
                                key={coach.id}
                                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                            >
                                {/* Header with name, role badge, and workload */}
                                <div className="p-5 border-b border-gray-100 dark:border-gray-700/50">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="mt-1 p-2 rounded-full bg-gray-100 dark:bg-gray-700/50">
                                            <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                                    {coach.full_name}
                                                </h3>
                                                <span className={clsx(
                                                    'text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap',
                                                    roleBadge.className
                                                )}>
                                                    {roleBadge.label}
                                                </span>
                                            </div>
                                            {coach.email && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                    {coach.email}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Workload indicator */}
                                    <div className="flex items-center gap-2">
                                        <Award className="w-4 h-4 text-gray-400" />
                                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Carga:</span>
                                        <span className={clsx(
                                            'text-xs font-semibold px-2 py-0.5 rounded-full',
                                            workloadBadge.className
                                        )}>
                                            {workloadBadge.label}
                                        </span>
                                    </div>
                                </div>

                                {/* Body: Team assignments as pills */}
                                <div className="p-5">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                            Equipos asignados
                                        </p>
                                        <button
                                            onClick={() => handleOpenAssignModal(coach.id)}
                                            className="btn-primary flex items-center gap-1.5 text-xs font-medium px-3 py-1.5"
                                        >
                                            <UserPlus className="w-3.5 h-3.5" />
                                            Asignar
                                        </button>
                                    </div>

                                    {coach.assignments.length === 0 ? (
                                        <div className="text-center py-6">
                                            <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                                                Sin equipos asignados
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {coach.assignments.map(assignment => {
                                                const teamData = getTeamDataForPill(assignment.team_id)

                                                return (
                                                    <div
                                                        key={assignment.id}
                                                        className="group relative flex items-center gap-2 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border border-orange-200 dark:border-orange-700/50 rounded-lg px-3 py-2 hover:shadow-sm transition-all"
                                                    >
                                                        {teamData && (
                                                            <TeamIdentifierDot
                                                                identifier={teamData.identifier}
                                                                size="sm"
                                                            />
                                                        )}
                                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                            {assignment.team_name}
                                                        </span>
                                                        <button
                                                            onClick={() => handleRemoveAssignment(
                                                                assignment.id,
                                                                coach.full_name,
                                                                assignment.team_name
                                                            )}
                                                            className="ml-1 opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                                                            title="Quitar asignación"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Assign Team Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Asignar Equipo</h2>
                            <button
                                onClick={() => setShowAssignModal(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAssignTeam} className="p-6">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Selecciona un equipo
                                </label>
                                <select
                                    required
                                    value={selectedTeamId}
                                    onChange={(e) => setSelectedTeamId(e.target.value)}
                                    className="input w-full"
                                >
                                    <option value="">-- Selecciona --</option>
                                    {getAvailableTeamsForCoach(selectedCoachId).map(team => (
                                        <option key={team.id} value={team.id}>
                                            {getTeamDisplayName(team)}
                                        </option>
                                    ))}
                                </select>
                                {getAvailableTeamsForCoach(selectedCoachId).length === 0 && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                        Todos los equipos ya están asignados a este entrenador.
                                    </p>
                                )}
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAssignModal(false)}
                                    className="btn-secondary text-sm font-medium"
                                    disabled={assigning}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary text-sm font-medium"
                                    disabled={assigning || !selectedTeamId}
                                >
                                    {assigning ? 'Asignando...' : 'Asignar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

