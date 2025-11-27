import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FileText, Save, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole'
import { teamSeasonPlanService } from '@/services/teamSeasonPlanService'
import { seasonService } from '@/services/seasonService'
import { teamService } from '@/services/teamService'
import { toast } from 'sonner'

export function TeamSeasonPlanPage() {
    const { teamId } = useParams<{ teamId: string }>()
    const navigate = useNavigate()
    const { profile } = useAuthStore()
    const { isDT, isCoach, assignedTeamIds } = useCurrentUserRole()

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [team, setTeam] = useState<any>(null)
    const [currentSeason, setCurrentSeason] = useState<any>(null)

    // Form state
    const [formData, setFormData] = useState({
        system_base: '',
        sistema_defensivo: '',
        sistema_ofensivo: '',
        servicio: '',
        objetivos: '',
        definicion_grupo: ''
    })

    // Check permissions
    const canEdit = isDT || (isCoach && teamId && assignedTeamIds.includes(teamId))

    useEffect(() => {
        const fetchData = async () => {
            if (!profile?.club_id || !teamId) return

            try {
                setLoading(true)

                // Get current season with fallback
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
                    toast.error('No hay una temporada activa')
                    setLoading(false)
                    return
                }
                setCurrentSeason(season)

                // Get team info
                const teamData = await teamService.getTeamById(teamId)
                if (!teamData) {
                    toast.error('Equipo no encontrado')
                    navigate('/teams')
                    return
                }
                setTeam(teamData)

                // Check permissions
                if (!isDT && (!isCoach || !assignedTeamIds.includes(teamId))) {
                    toast.error('No tienes permisos para editar este equipo')
                    navigate('/teams')
                    return
                }

                // Get existing plan
                const existingPlan = await teamSeasonPlanService.getPlanByTeamSeason(teamId, season.id)
                if (existingPlan) {
                    setFormData({
                        system_base: existingPlan.system_base || '',
                        sistema_defensivo: existingPlan.sistema_defensivo || '',
                        sistema_ofensivo: existingPlan.sistema_ofensivo || '',
                        servicio: existingPlan.servicio || '',
                        objetivos: existingPlan.objetivos || '',
                        definicion_grupo: existingPlan.definicion_grupo || ''
                    })
                }

            } catch (error) {
                console.error('Error fetching data:', error)
                toast.error('Error al cargar los datos')
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [profile?.club_id, teamId, isDT, isCoach, assignedTeamIds, navigate])

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }))
    }

    const handleSave = async () => {
        if (!profile?.club_id || !teamId || !currentSeason) return

        try {
            setSaving(true)

            await teamSeasonPlanService.upsertPlan({
                club_id: profile.club_id,
                season_id: currentSeason.id,
                team_id: teamId,
                created_by: profile.id,
                ...formData
            })

            toast.success('Planificación guardada correctamente')
        } catch (error) {
            console.error('Error saving plan:', error)
            toast.error('Error al guardar la planificación')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Cargando...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate('/teams')}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-500" />
                            </button>
                            <FileText className="w-8 h-8 text-primary-600" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Planificación de Equipo
                                </h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {team?.name} - Temporada {currentSeason?.name}
                                </p>
                            </div>
                        </div>
                        {canEdit && (
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Save className="w-5 h-5" />
                                {saving ? 'Guardando...' : 'Guardar'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Form */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="space-y-6">
                        {/* Sistema Base */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Sistema Base
                            </label>
                            <textarea
                                value={formData.system_base}
                                onChange={(e) => handleChange('system_base', e.target.value)}
                                disabled={!canEdit}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                                placeholder="Describe el sistema base del equipo..."
                            />
                        </div>

                        {/* Sistema Defensivo */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Sistema Defensivo
                            </label>
                            <textarea
                                value={formData.sistema_defensivo}
                                onChange={(e) => handleChange('sistema_defensivo', e.target.value)}
                                disabled={!canEdit}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                                placeholder="Describe el sistema defensivo..."
                            />
                        </div>

                        {/* Sistema Ofensivo */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Sistema Ofensivo
                            </label>
                            <textarea
                                value={formData.sistema_ofensivo}
                                onChange={(e) => handleChange('sistema_ofensivo', e.target.value)}
                                disabled={!canEdit}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                                placeholder="Describe el sistema ofensivo..."
                            />
                        </div>

                        {/* Servicio */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Servicio
                            </label>
                            <textarea
                                value={formData.servicio}
                                onChange={(e) => handleChange('servicio', e.target.value)}
                                disabled={!canEdit}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                                placeholder="Describe la estrategia de servicio..."
                            />
                        </div>

                        {/* Objetivos */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Objetivos del Equipo
                            </label>
                            <textarea
                                value={formData.objetivos}
                                onChange={(e) => handleChange('objetivos', e.target.value)}
                                disabled={!canEdit}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                                placeholder="Define los objetivos del equipo para esta temporada..."
                            />
                        </div>

                        {/* Definición del Grupo */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Definición del Grupo
                            </label>
                            <textarea
                                value={formData.definicion_grupo}
                                onChange={(e) => handleChange('definicion_grupo', e.target.value)}
                                disabled={!canEdit}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                                placeholder="Describe las características del grupo..."
                            />
                        </div>
                    </div>

                    {!canEdit && (
                        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                Solo puedes ver esta planificación. No tienes permisos para editarla.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
