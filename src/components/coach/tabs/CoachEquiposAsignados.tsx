import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Users } from 'lucide-react'
import { useSeasonStore } from '@/stores/seasonStore'
import { coachHistoryService } from '@/services/coachHistoryService'
import { teamService } from '@/services/teamService'
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole'
import { Button } from '@/components/ui/Button'
import { AssignTeamModal } from '@/components/coaches/AssignTeamModal'
import { toast } from 'sonner'
import type { CoachTeamSeasonDB } from '@/types/Coach'
import type { TeamDB } from '@/services/teamService'
import { useConfirmation } from '@/hooks/useConfirmation'

interface CoachEquiposAsignadosProps {
    coachId: string
}

export function CoachEquiposAsignados({ coachId }: CoachEquiposAsignadosProps) {
    const { isDT, isAdmin } = useCurrentUserRole()
    const { activeSeasonId } = useSeasonStore()
    const { confirm, ConfirmDialog } = useConfirmation()
    const [assignments, setAssignments] = useState<(CoachTeamSeasonDB & { team?: TeamDB | null })[]>([])
    const [loading, setLoading] = useState(true)
    const [showAssignModal, setShowAssignModal] = useState(false)
    const [editingAssignment, setEditingAssignment] = useState<CoachTeamSeasonDB | null>(null)

    const canEdit = isDT || isAdmin

    useEffect(() => {
        loadAssignments()
    }, [coachId, activeSeasonId])

    const loadAssignments = async () => {
        if (!activeSeasonId) return

        setLoading(true)
        try {
            const data = await coachHistoryService.getCoachTeamsBySeason(coachId, activeSeasonId)

            // Load team details for each assignment
            const withTeams = await Promise.all(
                data.map(async (assignment) => {
                    const team = await teamService.getTeamById(assignment.team_id)
                    return { ...assignment, team }
                })
            )

            setAssignments(withTeams)
        } catch (error) {
            console.error('Error loading assignments:', error)
            toast.error('Error al cargar equipos asignados')
        } finally {
            setLoading(false)
        }
    }

    const handleRemoveAssignment = async (assignmentId: string) => {
        const confirmed = await confirm({
            title: 'Quitar Asignación',
            message: 'El entrenador será desasignado de este equipo. No se eliminarán sus datos.',
            severity: 'warning',
            confirmText: 'QUITAR'
        })

        if (!confirmed) return

        try {
            await coachHistoryService.removeCoachFromTeamSeason(assignmentId)
            toast.success('Asignación eliminada')
            await loadAssignments()
        } catch (error) {
            console.error('Error removing assignment:', error)
            toast.error('Error al eliminar asignación')
        }
    }

    const handleEditRole = (assignment: CoachTeamSeasonDB) => {
        setEditingAssignment(assignment)
        setShowAssignModal(true)
    }

    const handleAssignSuccess = async () => {
        setShowAssignModal(false)
        setEditingAssignment(null)
        await loadAssignments()
    }

    const getRoleBadge = (role: string) => {
        const roleMap: Record<string, { label: string; className: string }> = {
            head: { label: 'Primer Entrenador', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200' },
            assistant: { label: 'Asistente', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200' },
            pf: { label: 'Preparador Físico', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' },
            other: { label: 'Otro', className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' }
        }
        return roleMap[role] || roleMap.other
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Equipos Asignados
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Temporada activa
                    </p>
                </div>
                {canEdit && (
                    <Button
                        variant="primary"
                        size="sm"
                        icon={Plus}
                        onClick={() => setShowAssignModal(true)}
                    >
                        Asignar a Equipo
                    </Button>
                )}
            </div>

            {/* Assignments List */}
            {assignments.length === 0 ? (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        No hay equipos asignados en esta temporada
                    </p>
                    {canEdit && (
                        <Button
                            variant="secondary"
                            size="sm"
                            icon={Plus}
                            onClick={() => setShowAssignModal(true)}
                            className="mt-4"
                        >
                            Asignar Primer Equipo
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid gap-4">
                    {assignments.map((assignment) => {
                        const roleBadge = getRoleBadge(assignment.role_in_team)

                        return (
                            <div
                                key={assignment.id}
                                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-primary-500 dark:hover:border-primary-400 transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                                                {assignment.team?.custom_name || `${assignment.team?.category} ${assignment.team?.gender}`}
                                            </h4>
                                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${roleBadge.className}`}>
                                                {roleBadge.label}
                                            </span>
                                        </div>

                                        {assignment.team && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {assignment.team.category} · {assignment.team.gender === 'male' ? 'Masculino' : 'Femenino'}
                                            </p>
                                        )}

                                        {(assignment.start_date || assignment.end_date) && (
                                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                                {assignment.start_date && `Desde: ${new Date(assignment.start_date).toLocaleDateString('es-ES')}`}
                                                {assignment.end_date && ` · Hasta: ${new Date(assignment.end_date).toLocaleDateString('es-ES')}`}
                                            </p>
                                        )}
                                    </div>

                                    {canEdit && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleEditRole(assignment)}
                                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                title="Cambiar rol"
                                            >
                                                <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                            </button>
                                            <button
                                                onClick={() => handleRemoveAssignment(assignment.id)}
                                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Quitar asignación"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                                            </button>
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
                <AssignTeamModal
                    coachId={coachId}
                    existingAssignment={editingAssignment || undefined}
                    assignedTeamIds={assignments.map(a => a.team_id)}
                    onClose={() => {
                        setShowAssignModal(false)
                        setEditingAssignment(null)
                    }}
                    onSuccess={handleAssignSuccess}
                />
            )}
            {ConfirmDialog}
        </div>
    )
}
