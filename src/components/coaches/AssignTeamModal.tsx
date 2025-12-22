import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useSeasonStore } from '@/stores/seasonStore'
import { teamService } from '@/services/teamService'
import { coachHistoryService } from '@/services/coachHistoryService'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import type { TeamDB } from '@/services/teamService'
import type { CoachTeamSeasonDB } from '@/types/Coach'

interface AssignTeamModalProps {
    coachId: string
    existingAssignment?: CoachTeamSeasonDB
    onClose: () => void
    onSuccess: () => void
}

export function AssignTeamModal({
    coachId,
    existingAssignment,
    onClose,
    onSuccess
}: AssignTeamModalProps) {
    const { profile } = useAuthStore()
    const { activeSeasonId } = useSeasonStore()
    const [teams, setTeams] = useState<TeamDB[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    const [formData, setFormData] = useState({
        teamId: existingAssignment?.team_id || '',
        role: existingAssignment?.role_in_team || 'head',
        startDate: existingAssignment?.start_date ? existingAssignment.start_date.split('T')[0] : '',
        endDate: existingAssignment?.end_date ? existingAssignment.end_date.split('T')[0] : ''
    })

    useEffect(() => {
        loadTeams()
    }, [])

    const loadTeams = async () => {
        if (!profile?.club_id) return

        try {
            const allTeams = await teamService.getTeamsByClub(profile.club_id)
            setTeams(allTeams)
        } catch (error) {
            console.error('Error loading teams:', error)
            toast.error('Error al cargar equipos')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.teamId || !activeSeasonId) {
            toast.error('Selecciona un equipo')
            return
        }

        setSubmitting(true)
        try {
            if (existingAssignment) {
                // Update existing assignment role only
                await coachHistoryService.updateCoachTeamRole(
                    existingAssignment.id,
                    formData.role as 'head' | 'assistant' | 'pf' | 'other'
                )
                toast.success('Rol actualizado')
            } else {
                // Create new assignment
                await coachHistoryService.addCoachToTeamSeason({
                    coach_id: coachId,
                    team_id: formData.teamId,
                    season_id: activeSeasonId,
                    role_in_team: formData.role as 'head' | 'assistant' | 'pf' | 'other',
                    start_date: formData.startDate || undefined,
                    end_date: formData.endDate || undefined
                })
                toast.success('Equipo asignado correctamente')
            }

            onSuccess()
        } catch (error: any) {
            console.error('Error assigning team:', error)
            toast.error(error.message || 'Error al asignar equipo')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {existingAssignment ? 'Editar Asignación' : 'Asignar a Equipo'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Team Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Equipo *
                        </label>
                        <select
                            required
                            value={formData.teamId}
                            onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                            disabled={loading || !!existingAssignment}
                            className="input w-full"
                        >
                            <option value="">Selecciona un equipo</option>
                            {teams.map((team) => (
                                <option key={team.id} value={team.id}>
                                    {team.custom_name || `${team.category} ${team.gender}`}
                                </option>
                            ))}
                        </select>
                        {existingAssignment && (
                            <p className="text-xs text-gray-500 mt-1">
                                No se puede cambiar el equipo. Elimina y crea una nueva asignación.
                            </p>
                        )}
                    </div>

                    {/* Role */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Rol *
                        </label>
                        <select
                            required
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value as 'head' | 'assistant' | 'pf' | 'other' })}
                            className="input w-full"
                        >
                            <option value="head">Primer Entrenador</option>
                            <option value="assistant">Asistente</option>
                            <option value="pf">Preparador Físico</option>
                            <option value="other">Otro</option>
                        </select>
                    </div>

                    {/* Start Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Fecha de Inicio
                        </label>
                        <input
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            className="input w-full"
                        />
                    </div>

                    {/* End Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Fecha de Fin
                        </label>
                        <input
                            type="date"
                            value={formData.endDate}
                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                            className="input w-full"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Dejar vacío si la asignación sigue activa
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            size="md"
                            onClick={onClose}
                            className="flex-1"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            size="md"
                            disabled={submitting || loading}
                            className="flex-1"
                        >
                            {submitting ? 'Guardando...' : existingAssignment ? 'Actualizar' : 'Asignar'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
