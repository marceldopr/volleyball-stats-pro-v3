import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronUp, Target, List, Zap, AlertTriangle, BarChart3, FileCheck, Plus, X, Save } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole'
import { teamSeasonPhaseService, TeamSeasonPhaseDB } from '@/services/teamSeasonPhaseService'
import { teamSeasonContextService } from '@/services/teamSeasonContextService'
import { seasonService } from '@/services/seasonService'
import { teamService } from '@/services/teamService'
import { toast } from 'sonner'

export function TeamSeasonPlanPage() {
    const { teamId } = useParams<{ teamId: string }>()
    const navigate = useNavigate()
    const { profile } = useAuthStore()
    const { isDT, isCoach, assignedTeamIds } = useCurrentUserRole()

    const [loading, setLoading] = useState(true)
    const [team, setTeam] = useState<any>(null)
    const [currentSeason, setCurrentSeason] = useState<any>(null)
    const [context, setContext] = useState<any>(null)
    const [phases, setPhases] = useState<TeamSeasonPhaseDB[]>([])
    const [expandedPhase, setExpandedPhase] = useState<number | null>(1)
    const [editingPhase, setEditingPhase] = useState<TeamSeasonPhaseDB | null>(null)

    // Check permissions
    const canEdit = isDT || (isCoach && teamId && assignedTeamIds.includes(teamId))

    useEffect(() => {
        const fetchData = async () => {
            if (!profile?.club_id || !teamId) return

            try {
                setLoading(true)

                // Get current season
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
                    toast.error('No tienes permisos para ver este equipo')
                    navigate('/teams')
                    return
                }

                // Get team season context
                const teamContext = await teamSeasonContextService.getContextByTeamAndSeason(teamId, season.id)
                setContext(teamContext)

                // Get or initialize phases
                const existingPhases = await teamSeasonPhaseService.getPhasesByTeamAndSeason(teamId, season.id)
                if (existingPhases.length === 0) {
                    const initializedPhases = await teamSeasonPhaseService.initializeDefaultPhases(teamId, season.id)
                    setPhases(initializedPhases)
                } else {
                    setPhases(existingPhases)
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

    const handleEditPhase = (phase: TeamSeasonPhaseDB) => {
        setEditingPhase({ ...phase })
    }

    const handleSavePhase = async () => {
        if (!editingPhase) return

        try {
            const updated = await teamSeasonPhaseService.upsertPhase({
                team_id: editingPhase.team_id,
                season_id: editingPhase.season_id,
                phase_number: editingPhase.phase_number,
                phase_name: editingPhase.phase_name,
                primary_objective: editingPhase.primary_objective || undefined,
                secondary_objectives: editingPhase.secondary_objectives || undefined,
                technical_priorities: editingPhase.technical_priorities || undefined,
                risks_weaknesses: editingPhase.risks_weaknesses || undefined,
                kpi: editingPhase.kpi || undefined,
                evaluation_status: editingPhase.evaluation_status || undefined,
                evaluation_reason: editingPhase.evaluation_reason || undefined,
                lessons_learned: editingPhase.lessons_learned || undefined,
                adjustments_next_phase: editingPhase.adjustments_next_phase || undefined,
            })

            setPhases(phases.map(p => p.id === updated.id ? updated : p))
            setEditingPhase(null)
            toast.success('Fase guardada correctamente')
        } catch (error) {
            console.error('Error saving phase:', error)
            toast.error('Error al guardar la fase')
        }
    }

    const addSecondaryObjective = () => {
        if (!editingPhase) return
        const newObj = prompt('Nuevo objetivo secundario:')
        if (newObj?.trim()) {
            setEditingPhase({
                ...editingPhase,
                secondary_objectives: [...(editingPhase.secondary_objectives || []), newObj.trim()]
            })
        }
    }

    const removeSecondaryObjective = (index: number) => {
        if (!editingPhase) return
        setEditingPhase({
            ...editingPhase,
            secondary_objectives: (editingPhase.secondary_objectives || []).filter((_, i) => i !== index)
        })
    }

    const addTechnicalPriority = () => {
        if (!editingPhase) return
        const newPriority = prompt('Nueva prioridad técnica:')
        if (newPriority?.trim()) {
            setEditingPhase({
                ...editingPhase,
                technical_priorities: [...(editingPhase.technical_priorities || []), newPriority.trim()]
            })
        }
    }

    const removeTechnicalPriority = (index: number) => {
        if (!editingPhase) return
        setEditingPhase({
            ...editingPhase,
            technical_priorities: (editingPhase.technical_priorities || []).filter((_, i) => i !== index)
        })
    }

    const getPhaseIcon = (phaseNumber: number) => {
        const icons = ['📘', '📗', '📕']
        return icons[phaseNumber - 1] || '📙'
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium">Cargando planificación...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/teams')}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-500" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                Planificación por Fases
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">
                                {team?.name} - Temporada {currentSeason?.name}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Context Reference */}
                {context && (
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-purple-900 mb-2">Contexto del Equipo</h3>
                        <div className="space-y-1">
                            {context.primary_goal && (
                                <p className="text-sm text-purple-800">
                                    <span className="font-medium">Objetivo:</span> {context.primary_goal}
                                </p>
                            )}
                            {context.training_focus && context.training_focus.length > 0 && (
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium text-purple-800">Prioridades:</span>
                                    {context.training_focus.map((priority: string, idx: number) => (
                                        <span key={idx} className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full">
                                            {priority}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Phases */}
                {phases.map((phase) => {
                    const isEditing = editingPhase?.id === phase.id
                    const currentPhase = isEditing ? editingPhase : phase
                    const isExpanded = expandedPhase === phase.phase_number

                    return (
                        <div key={phase.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                            {/* Phase Header */}
                            <button
                                onClick={() => setExpandedPhase(isExpanded ? null : phase.phase_number)}
                                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{getPhaseIcon(phase.phase_number)}</span>
                                    <div className="text-left">
                                        <h3 className="text-lg font-bold text-gray-900">
                                            Fase {phase.phase_number} — {phase.phase_name}
                                        </h3>
                                        {currentPhase.primary_objective && (
                                            <p className="text-sm text-gray-600 mt-1">{currentPhase.primary_objective}</p>
                                        )}
                                    </div>
                                </div>
                                {isExpanded ? (
                                    <ChevronUp className="w-5 h-5 text-gray-400" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                )}
                            </button>

                            {/* Phase Content */}
                            {isExpanded && (
                                <div className="p-6 border-t border-gray-200 space-y-6">
                                    {/* A) Objetivo Principal */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Target className="w-5 h-5 text-primary-600" />
                                            <h4 className="font-semibold text-gray-900">¿Qué queréis conseguir en esta fase?</h4>
                                        </div>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={currentPhase.primary_objective || ''}
                                                onChange={(e) => setEditingPhase({ ...editingPhase, primary_objective: e.target.value })}
                                                placeholder="Ej: Consolidar recepción y rotación base"
                                                className="input-field w-full"
                                            />
                                        ) : (
                                            <p className="text-gray-700">{currentPhase.primary_objective || 'Sin definir'}</p>
                                        )}
                                    </div>

                                    {/* B) Objetivos Secundarios */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <List className="w-5 h-5 text-blue-600" />
                                            <h4 className="font-semibold text-gray-900">Objetivos Secundarios</h4>
                                        </div>
                                        {isEditing ? (
                                            <div className="space-y-2">
                                                {(currentPhase.secondary_objectives || []).map((obj, idx) => (
                                                    <div key={idx} className="flex items-center gap-2">
                                                        <span className="text-gray-700 flex-1">• {obj}</span>
                                                        <button
                                                            onClick={() => removeSecondaryObjective(idx)}
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                                <button onClick={addSecondaryObjective} className="btn-secondary text-sm">
                                                    <Plus className="w-4 h-4" />
                                                    Añadir objetivo
                                                </button>
                                            </div>
                                        ) : (
                                            <ul className="space-y-1">
                                                {(currentPhase.secondary_objectives || []).map((obj, idx) => (
                                                    <li key={idx} className="text-gray-700">• {obj}</li>
                                                ))}
                                                {(!currentPhase.secondary_objectives || currentPhase.secondary_objectives.length === 0) && (
                                                    <p className="text-gray-500 italic">Sin objetivos secundarios</p>
                                                )}
                                            </ul>
                                        )}
                                    </div>

                                    {/* C) Prioridades Técnicas */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Zap className="w-5 h-5 text-yellow-600" />
                                            <h4 className="font-semibold text-gray-900">¿Qué aspectos técnicos vais a priorizar?</h4>
                                        </div>
                                        {isEditing ? (
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap gap-2">
                                                    {(currentPhase.technical_priorities || []).map((priority, idx) => (
                                                        <div key={idx} className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-full text-sm">
                                                            <span>{priority}</span>
                                                            <button onClick={() => removeTechnicalPriority(idx)} className="hover:text-yellow-900">
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <button onClick={addTechnicalPriority} className="btn-secondary text-sm">
                                                    <Plus className="w-4 h-4" />
                                                    Añadir prioridad
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {(currentPhase.technical_priorities || []).map((priority, idx) => (
                                                    <span key={idx} className="bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-full text-sm">
                                                        {priority}
                                                    </span>
                                                ))}
                                                {(!currentPhase.technical_priorities || currentPhase.technical_priorities.length === 0) && (
                                                    <p className="text-gray-500 italic">Sin prioridades definidas</p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* D) Riesgos */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <AlertTriangle className="w-5 h-5 text-orange-600" />
                                            <h4 className="font-semibold text-gray-900">¿Qué debilidades habéis detectado?</h4>
                                        </div>
                                        {isEditing ? (
                                            <textarea
                                                value={currentPhase.risks_weaknesses || ''}
                                                onChange={(e) => setEditingPhase({ ...editingPhase, risks_weaknesses: e.target.value })}
                                                placeholder="Ej: Equipo sufre en saque flotante. OH2 bloquea tarde contra rivales altos."
                                                className="input-field w-full"
                                                rows={3}
                                            />
                                        ) : (
                                            <p className="text-gray-700">{currentPhase.risks_weaknesses || 'Sin riesgos identificados'}</p>
                                        )}
                                    </div>

                                    {/* E) KPI */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <BarChart3 className="w-5 h-5 text-green-600" />
                                            <h4 className="font-semibold text-gray-900">Indicador de Rendimiento (KPI)</h4>
                                        </div>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={currentPhase.kpi || ''}
                                                onChange={(e) => setEditingPhase({ ...editingPhase, kpi: e.target.value })}
                                                placeholder="Ej: Recepción ≥ 60%"
                                                className="input-field w-full"
                                            />
                                        ) : (
                                            <p className="text-gray-700">{currentPhase.kpi || 'Sin KPI definido'}</p>
                                        )}
                                    </div>

                                    {/* F) Autoevaluación */}
                                    <div className="border-t border-gray-200 pt-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <FileCheck className="w-5 h-5 text-purple-600" />
                                            <h4 className="font-semibold text-gray-900">¿Se ha cumplido el objetivo de la fase?</h4>
                                        </div>

                                        {isEditing ? (
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                                                    <select
                                                        value={currentPhase.evaluation_status || ''}
                                                        onChange={(e) => setEditingPhase({ ...editingPhase, evaluation_status: e.target.value as any })}
                                                        className="input-field w-full"
                                                    >
                                                        <option value="">Sin evaluar</option>
                                                        <option value="Cumplido">Cumplido</option>
                                                        <option value="Parcial">Parcial</option>
                                                        <option value="No Cumplido">No Cumplido</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Motivo</label>
                                                    <textarea
                                                        value={currentPhase.evaluation_reason || ''}
                                                        onChange={(e) => setEditingPhase({ ...editingPhase, evaluation_reason: e.target.value })}
                                                        className="input-field w-full"
                                                        rows={2}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Lecciones aprendidas</label>
                                                    <textarea
                                                        value={currentPhase.lessons_learned || ''}
                                                        onChange={(e) => setEditingPhase({ ...editingPhase, lessons_learned: e.target.value })}
                                                        className="input-field w-full"
                                                        rows={2}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Ajustes para la siguiente fase</label>
                                                    <textarea
                                                        value={currentPhase.adjustments_next_phase || ''}
                                                        onChange={(e) => setEditingPhase({ ...editingPhase, adjustments_next_phase: e.target.value })}
                                                        className="input-field w-full"
                                                        rows={2}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {currentPhase.evaluation_status ? (
                                                    <>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${currentPhase.evaluation_status === 'Cumplido' ? 'bg-green-100 text-green-800' :
                                                                    currentPhase.evaluation_status === 'Parcial' ? 'bg-yellow-100 text-yellow-800' :
                                                                        'bg-red-100 text-red-800'
                                                                }`}>
                                                                {currentPhase.evaluation_status}
                                                            </span>
                                                        </div>
                                                        {currentPhase.evaluation_reason && (
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-700">Motivo:</p>
                                                                <p className="text-gray-600">{currentPhase.evaluation_reason}</p>
                                                            </div>
                                                        )}
                                                        {currentPhase.lessons_learned && (
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-700">Lecciones aprendidas:</p>
                                                                <p className="text-gray-600">{currentPhase.lessons_learned}</p>
                                                            </div>
                                                        )}
                                                        {currentPhase.adjustments_next_phase && (
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-700">Ajustes para la siguiente fase:</p>
                                                                <p className="text-gray-600">{currentPhase.adjustments_next_phase}</p>
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <p className="text-gray-500 italic">Fase sin evaluar</p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Edit/Save Buttons */}
                                    {canEdit && (
                                        <div className="flex gap-2 pt-4 border-t border-gray-200">
                                            {isEditing ? (
                                                <>
                                                    <button onClick={handleSavePhase} className="btn-primary flex items-center gap-2">
                                                        <Save className="w-4 h-4" />
                                                        Guardar Cambios
                                                    </button>
                                                    <button onClick={() => setEditingPhase(null)} className="btn-outline">
                                                        Cancelar
                                                    </button>
                                                </>
                                            ) : (
                                                <button onClick={() => handleEditPhase(phase)} className="btn-secondary">
                                                    Editar Fase
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}

                {!canEdit && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                            Solo puedes ver esta planificación. No tienes permisos para editarla.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
