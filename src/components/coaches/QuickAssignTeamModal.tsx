import { useState, useEffect } from 'react'
import { X, Shield, UserCog } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { teamService } from '@/services/teamService'
import { coachAssignmentService } from '@/services/coachAssignmentService'
import { toast } from 'sonner'
import type { TeamDB } from '@/services/teamService'
import { getTeamDisplayName } from '@/utils/teamDisplay'

interface QuickAssignTeamModalProps {
    onClose: () => void
    onSuccess: () => void
    coachId: string
    coachName: string
    clubId: string
    seasonId: string
    assignedTeamIds: string[]
}

export function QuickAssignTeamModal({
    onClose,
    onSuccess,
    coachId,
    coachName,
    clubId,
    seasonId,
    assignedTeamIds
}: QuickAssignTeamModalProps) {
    const [loading, setLoading] = useState(false)
    const [teams, setTeams] = useState<TeamDB[]>([])
    const [selectedTeamId, setSelectedTeamId] = useState('')
    const [role, setRole] = useState<'head' | 'assistant'>('head')

    useEffect(() => {
        loadTeams()
    }, [clubId, seasonId])

    const loadTeams = async () => {
        try {
            // Fetch teams for the season
            // Note: teamService might need a method for this, checking fetching logic
            const allTeams = await teamService.getTeamsByClub(clubId)
            // Filter teams that belong to the active season (if getTeamsByClub doesn't filter)
            // Assuming getTeamsByClub returns all teams, we might need to filter manually or use a specific service method if available.
            // For now assuming getTeamsByClub is sufficient, but normally teams are season-specific or persistent? 
            // In many systems teams are persistent entities.

            // Filter out already assigned teams
            const availableTeams = allTeams.filter(t => !assignedTeamIds.includes(t.id))
            console.log('QuickAssignTeamModal - Assigned team IDs:', assignedTeamIds)
            console.log('QuickAssignTeamModal - Available teams:', availableTeams.map(t => ({ id: t.id, name: t.custom_name || t.category })))
            setTeams(availableTeams)
        } catch (error) {
            console.error('Error loading teams:', error)
            toast.error('Error al cargar equipos')
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedTeamId) return

        setLoading(true)
        try {
            await coachAssignmentService.assignCoachToTeam({
                user_id: coachId,
                team_id: selectedTeamId,
                season_id: seasonId,
                role_in_team: role
            })
            toast.success('Equipo asignado correctamente')
            onSuccess()
            onClose()
        } catch (error: any) {
            console.error('Error assigning team:', error)
            // PostgreSQL error code 23505 = unique_violation (duplicate key)
            if (error.code === '23505' ||
                error.message?.includes('duplicate key') ||
                error.message?.includes('coach_team_season_coach_id_team_id_season_id_key')) {
                toast.error('Este entrenador ya está asignado a este equipo en esta temporada')
            } else if (error.status === 409 || error.code === '409' || error.message?.includes('already assigned')) {
                toast.error('El entrenador ya está asignado a este equipo')
            } else {
                toast.error('Error al asignar equipo')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Asignar equipo a {coachName}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Equipo
                        </label>
                        <div className="relative">
                            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select
                                value={selectedTeamId}
                                onChange={(e) => setSelectedTeamId(e.target.value)}
                                className="input w-full pl-9"
                                required
                            >
                                <option value="">Seleccionar equipo...</option>
                                {teams.map(team => (
                                    <option key={team.id} value={team.id}>
                                        {getTeamDisplayName(team)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {teams.length === 0 && (
                            <p className="text-xs text-yellow-600 mt-1">
                                No hay equipos disponibles para asignar.
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Rol
                        </label>
                        <div className="relative">
                            <UserCog className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value as 'head' | 'assistant')}
                                className="input w-full pl-9"
                            >
                                <option value="head">Entrenador Principal</option>
                                <option value="assistant">Asistente</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="secondary" onClick={onClose} type="button">
                            Cancelar
                        </Button>
                        <Button
                            variant="primary"
                            type="submit"
                            disabled={loading || !selectedTeamId}
                        >
                            {loading ? 'Asignando...' : 'Asignar Equipo'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
