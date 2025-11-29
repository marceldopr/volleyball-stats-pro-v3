import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Target, AlertTriangle, Zap, FileCheck2, Calendar } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole'
import { teamSeasonPhaseService, TeamSeasonPhaseDB } from '@/services/teamSeasonPhaseService'
import { phaseEvaluationService, PhaseEvaluationDB } from '@/services/phaseEvaluationService'
import { seasonService } from '@/services/seasonService'
import { teamService } from '@/services/teamService'
import { PhaseEvaluationModal } from '@/components/PhaseEvaluationModal'
import { toast } from 'sonner'

export function TeamSeasonSummaryPage() {
    const { teamId, seasonId } = useParams<{ teamId: string, seasonId: string }>()
    const navigate = useNavigate()
    const { profile } = useAuthStore()
    const { isDT, isCoach, assignedTeamIds } = useCurrentUserRole()

    const [loading, setLoading] = useState(true)
    const [team, setTeam] = useState<any>(null)
    const [season, setSeason] = useState<any>(null)
    const [phases, setPhases] = useState<TeamSeasonPhaseDB[]>([])
    const [evaluations, setEvaluations] = useState<Record<string, PhaseEvaluationDB>>({})
    const [evaluationModalOpen, setEvaluationModalOpen] = useState(false)
    const [selectedPhaseForEvaluation, setSelectedPhaseForEvaluation] = useState<TeamSeasonPhaseDB | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            if (!profile?.club_id || !teamId || !seasonId) return

            try {
                setLoading(true)

                // Get team info
                const teamData = await teamService.getTeamById(teamId)
                if (!teamData) {
                    toast.error('Equipo no encontrado')
                    navigate('/teams')
                    return
                }
                setTeam(teamData)

                // Get season info
                // Note: seasonService doesn't have getSeasonById exposed directly in the interface used elsewhere?
                // We'll fetch all seasons and find the one we need, or assume it's correct if we just need the name.
                // For now, let's try to get it from the list.
                const allSeasons = await seasonService.getSeasonsByClub(profile.club_id)
                const currentSeason = allSeasons.find(s => s.id === seasonId)

                if (!currentSeason) {
                    // Fallback if not found in list (shouldn't happen if ID is valid)
                    toast.error('Temporada no encontrada')
                    navigate('/teams')
                    return
                }
                setSeason(currentSeason)

                // Check permissions
                if (!isDT && (!isCoach || !assignedTeamIds.includes(teamId))) {
                    toast.error('No tienes permisos para ver este equipo')
                    navigate('/teams')
                    return
                }

                // Get phases
                const existingPhases = await teamSeasonPhaseService.getPhasesByTeamAndSeason(teamId, seasonId)
                setPhases(existingPhases)

                // Get evaluations
                const allEvaluations = await phaseEvaluationService.getEvaluationsByTeamAndSeason(teamId, seasonId)
                const evaluationsMap: Record<string, PhaseEvaluationDB> = {}
                allEvaluations.forEach(evaluation => {
                    evaluationsMap[evaluation.phase_id] = evaluation
                })
                setEvaluations(evaluationsMap)

            } catch (error) {
                console.error('Error fetching data:', error)
                toast.error('Error al cargar los datos')
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [profile?.club_id, teamId, seasonId, isDT, isCoach, assignedTeamIds, navigate])

    const handleOpenEvaluationModal = (phase: TeamSeasonPhaseDB) => {
        setSelectedPhaseForEvaluation(phase)
        setEvaluationModalOpen(true)
    }

    const getEvaluationBadge = (status: string) => {
        const badges = {
            'Cumplido': { bg: 'bg-green-100', text: 'text-green-800', icon: '✔️' },
            'Parcial': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '⚠️' },
            'No Cumplido': { bg: 'bg-red-100', text: 'text-red-800', icon: '❌' }
        }
        const badge = badges[status as keyof typeof badges] || badges['Parcial']
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                <span>{badge.icon}</span>
                <span>{status}</span>
            </span>
        )
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium">Cargando resumen...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/teams')}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-500" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">
                                Resumen de Temporada
                            </h1>
                            <p className="text-sm text-gray-500">
                                {team?.name} • {season?.name}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {phases.map((phase) => {
                        const evaluation = evaluations[phase.id]

                        return (
                            <div key={phase.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">
                                {/* Card Header */}
                                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <h3 className="font-bold text-gray-900 line-clamp-1">
                                            Fase {phase.phase_number}: {phase.phase_name}
                                        </h3>
                                        {evaluation ? (
                                            getEvaluationBadge(evaluation.status)
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                En curso
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Card Content */}
                                <div className="p-4 flex-1 space-y-4">
                                    {/* Objetivo */}
                                    <div>
                                        <div className="flex items-center gap-1.5 mb-1 text-primary-700">
                                            <Target className="w-4 h-4" />
                                            <span className="text-xs font-bold uppercase tracking-wide">Objetivo Principal</span>
                                        </div>
                                        <p className="text-sm text-gray-700 line-clamp-3">
                                            {phase.primary_objective || <span className="text-gray-400 italic">No definido</span>}
                                        </p>
                                    </div>

                                    {/* Debilidad / Riesgo (Planificación) */}
                                    {phase.risks_weaknesses && (
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-1 text-orange-700">
                                                <AlertTriangle className="w-4 h-4" />
                                                <span className="text-xs font-bold uppercase tracking-wide">Debilidad Detectada</span>
                                            </div>
                                            <p className="text-sm text-gray-700 line-clamp-2">
                                                {phase.risks_weaknesses}
                                            </p>
                                        </div>
                                    )}

                                    {/* Ajuste (Evaluación) */}
                                    {evaluation && evaluation.next_adjustments && (
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-1 text-purple-700">
                                                <Zap className="w-4 h-4" />
                                                <span className="text-xs font-bold uppercase tracking-wide">Ajuste Aplicado</span>
                                            </div>
                                            <p className="text-sm text-gray-700 line-clamp-3 bg-purple-50 p-2 rounded-md border border-purple-100">
                                                {evaluation.next_adjustments}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Card Footer */}
                                <div className="p-4 pt-0 mt-auto">
                                    {evaluation ? (
                                        <button
                                            onClick={() => handleOpenEvaluationModal(phase)}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            <FileCheck2 className="w-4 h-4" />
                                            Ver Evaluación completa
                                        </button>
                                    ) : (
                                        <div className="text-center py-2">
                                            <span className="text-xs text-gray-400 italic">
                                                Fase aún no evaluada
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {phases.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900">No hay fases planificadas</h3>
                        <p className="text-gray-500 mt-1">Configura la planificación del equipo para ver el resumen.</p>
                        <button
                            onClick={() => navigate(`/teams/${teamId}/season-plan`)}
                            className="mt-4 btn-primary"
                        >
                            Ir a Planificación
                        </button>
                    </div>
                )}
            </div>

            {/* Read-only Evaluation Modal */}
            {selectedPhaseForEvaluation && (
                <PhaseEvaluationModal
                    isOpen={evaluationModalOpen}
                    onClose={() => {
                        setEvaluationModalOpen(false)
                        setSelectedPhaseForEvaluation(null)
                    }}
                    phase={selectedPhaseForEvaluation}
                    existingEvaluation={evaluations[selectedPhaseForEvaluation.id] || null}
                    onSave={async () => {
                        // Read-only mode, essentially. 
                        // But if we wanted to allow editing from here, we'd pass the save handler.
                        // For now, let's keep it simple and just close.
                        setEvaluationModalOpen(false)
                    }}
                />
            )}
        </div>
    )
}

