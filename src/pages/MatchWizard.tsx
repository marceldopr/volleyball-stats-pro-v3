import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Calendar, Clock, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { useRoleScope } from '@/hooks/useRoleScope'
import { seasonService } from '@/services/seasonService'
import { teamService } from '@/services/teamService'
import { matchService } from '@/services/matchService'
import { getTeamDisplayName } from '@/utils/teamDisplay'
import { toast } from 'sonner'

export function MatchWizard() {
    const navigate = useNavigate()
    const { profile } = useAuthStore()
    const { isCoach, assignedTeamIds, loading: roleLoading } = useRoleScope()

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [currentSeason, setCurrentSeason] = useState<any>(null)
    const [availableTeams, setAvailableTeams] = useState<any[]>([])

    interface WizardFormData {
        teamId: string
        opponentName: string
        competitionName: string
        matchDate: string
        matchTime: string
        homeAway: 'home' | 'away'
    }

    const [searchParams] = useSearchParams()

    const [formData, setFormData] = useState<WizardFormData>(() => {
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const today = `${year}-${month}-${day}`

        // Format HH:MM
        const hours = String(now.getHours()).padStart(2, '0')
        const minutes = String(now.getMinutes()).padStart(2, '0')
        const timeNow = `${hours}:${minutes}`

        return {
            teamId: searchParams.get('teamId') || '',
            opponentName: '',
            competitionName: '',
            matchDate: today,
            matchTime: timeNow,
            homeAway: 'home'
        }
    })

    // Team loading pattern with role-based filtering
    useEffect(() => {
        const fetchData = async () => {
            if (!profile?.club_id || roleLoading) return

            try {
                setLoading(true)
                const season = await seasonService.getCurrentSeasonByClub(profile.club_id)
                if (!season) {
                    toast.error('No hay una temporada activa')
                    setLoading(false)
                    return
                }
                setCurrentSeason(season)

                // Load teams based on role
                let teams
                if (isCoach && assignedTeamIds.length > 0) {
                    // Coach: only assigned teams
                    teams = await teamService.getTeamsByIds(assignedTeamIds)
                } else {
                    // DT: all club teams
                    teams = await teamService.getTeamsByClubAndSeason(profile.club_id, season.id)
                }

                setAvailableTeams(teams)

                if (teams.length === 0) {
                    toast.error(isCoach ? 'No tienes equipos asignados' : 'No hay equipos en esta temporada')
                }
            } catch (error) {
                console.error('Error loading data:', error)
                toast.error('Error al cargar datos')
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [profile?.club_id, isCoach, assignedTeamIds, roleLoading])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.teamId) {
            toast.error('Selecciona un equipo')
            return
        }
        if (!formData.opponentName.trim()) {
            toast.error('Introduce el nombre del rival')
            return
        }
        if (!formData.matchDate) {
            toast.error('Selecciona la fecha del partido')
            return
        }


        if (!profile?.club_id || !currentSeason) {
            toast.error('Error: No se encontró el club o la temporada')
            return
        }

        try {
            setSaving(true)

            await matchService.createMatch({
                club_id: profile.club_id,
                season_id: currentSeason.id,
                team_id: formData.teamId,
                opponent_name: formData.opponentName.trim(),
                competition_name: formData.competitionName.trim() || undefined,
                match_date: formData.matchDate,
                match_time: formData.matchTime,
                home_away: formData.homeAway
            })

            toast.success('¡Partido creado con éxito!')
            navigate('/matches')
        } catch (error) {
            console.error('Error creating V2 match:', error)
            toast.error('Error al crear el partido')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">Cargando...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                icon={ArrowLeft}
                                onClick={() => navigate('/matches')}
                            >
                                Volver
                            </Button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Crear Partido
                                </h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Sistema con event-sourcing y undo/redo ilimitado
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <form onSubmit={handleSubmit}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                <strong>Este partido usará event-sourcing con capacidad de undo/redo ilimitado.</strong>
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                Equipo <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.teamId}
                                onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            >
                                <option value="">Selecciona un equipo</option>
                                {availableTeams.map((team) => (
                                    <option key={team.id} value={team.id}>
                                        {getTeamDisplayName(team)}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-400 mt-1">Equipo de tu club que jugará el partido</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                Rival <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.opponentName}
                                onChange={(e) => setFormData({ ...formData, opponentName: e.target.value })}
                                placeholder="Nombre del equipo rival"
                                data-testid="opponent-name-input"
                                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                Competición
                            </label>
                            <input
                                type="text"
                                value={formData.competitionName}
                                onChange={(e) => setFormData({ ...formData, competitionName: e.target.value })}
                                placeholder="Liga, Copa, Torneo..."
                                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <p className="text-xs text-gray-400 mt-1">Opcional</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                    <Calendar className="inline w-4 h-4 mr-1" />
                                    Fecha <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={formData.matchDate}
                                    onChange={(e) => setFormData({ ...formData, matchDate: e.target.value })}
                                    data-testid="match-date-input"
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                    <Clock className="inline w-4 h-4 mr-1" />
                                    Hora
                                </label>
                                <input
                                    type="time"
                                    value={formData.matchTime}
                                    onChange={(e) => setFormData({ ...formData, matchTime: e.target.value })}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                <MapPin className="inline w-4 h-4 mr-1" />
                                Condición <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, homeAway: 'home' })}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${formData.homeAway === 'home'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        }`}
                                >
                                    Local
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, homeAway: 'away' })}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${formData.homeAway === 'away'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        }`}
                                >
                                    Visitante
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <Button
                                type="button"
                                variant="secondary"
                                size="md"
                                onClick={() => navigate('/matches')}
                                disabled={saving}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                variant="danger"
                                size="md"
                                disabled={saving}
                                data-testid="wizard-save-btn"
                            >
                                {saving ? 'Creando...' : 'Crear Partido'}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}
