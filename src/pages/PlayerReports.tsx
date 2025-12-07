import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { FileText, Plus, Calendar, TrendingUp, Users, Heart, Target } from 'lucide-react'
import { playerReportService } from '@/services/playerReportService'
import { PlayerReportDB } from '@/types/ReportTypes'
import { useAuthStore } from '@/stores/authStore'
import { PlayerReportForm } from '@/components/reports/PlayerReportForm'
import { seasonService } from '@/services/seasonService'
import { teamService } from '@/services/teamService'
import { playerTeamSeasonService } from '@/services/playerTeamSeasonService'
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole'
import { Button } from '@/components/ui/Button'

export default function PlayerReportsPage() {
    const { playerId } = useParams<{ playerId: string }>()
    const { profile } = useAuthStore()
    const { isCoach, assignedTeamIds } = useCurrentUserRole()

    const [reports, setReports] = useState<PlayerReportDB[]>([])
    const [loading, setLoading] = useState(true)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [selectedReport, setSelectedReport] = useState<PlayerReportDB | null>(null)

    // State for team and season
    const [currentSeasonId, setCurrentSeasonId] = useState<string>('')
    const [currentTeamId, setCurrentTeamId] = useState<string>('')

    // Permission state
    const [canCreateReport, setCanCreateReport] = useState(true)
    const [permissionMessage, setPermissionMessage] = useState('')

    // Load current season and team
    useEffect(() => {
        const loadSeasonAndTeam = async () => {
            if (!profile?.club_id || !playerId) return

            try {
                // Get current season
                const season = await seasonService.getCurrentSeasonByClub(profile.club_id)
                if (season) {
                    setCurrentSeasonId(season.id)

                    // Get player's current team from player_team_season
                    const playerAssignment = await playerTeamSeasonService.getPlayerTeamBySeason(
                        playerId,
                        season.id
                    )

                    if (playerAssignment) {
                        setCurrentTeamId(playerAssignment.team_id)

                        // Check permissions for coaches
                        if (isCoach) {
                            const hasPermission = assignedTeamIds.includes(playerAssignment.team_id)
                            setCanCreateReport(hasPermission)

                            if (!hasPermission) {
                                setPermissionMessage(
                                    'No tienes permisos para crear informes sobre esta jugadora (no pertenece a tus equipos asignados).'
                                )
                            }
                        } else {
                            // DT and Admin always have permission
                            setCanCreateReport(true)
                        }
                    } else {
                        // Player not assigned to any team in current season
                        // Fallback: get first team from current season
                        const teams = await teamService.getTeamsByClubAndSeason(profile.club_id, season.id)
                        if (teams.length > 0) {
                            setCurrentTeamId(teams[0].id)
                        }

                        if (isCoach) {
                            setCanCreateReport(false)
                            setPermissionMessage(
                                'Esta jugadora no está asignada a ningún equipo en la temporada actual.'
                            )
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading season/team:', error)
            }
        }

        loadSeasonAndTeam()
    }, [profile?.club_id, playerId, isCoach, assignedTeamIds])

    // Load reports
    useEffect(() => {
        loadReports()
    }, [playerId])

    const loadReports = async () => {
        if (!playerId) return

        try {
            setLoading(true)
            const data = await playerReportService.getReportsByPlayer(playerId)
            setReports(data)
        } catch (error) {
            console.error('Error loading reports:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSaved = () => {
        setIsFormOpen(false)
        loadReports()
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    const getRoleLabel = (status: string) => {
        const labels: Record<string, string> = {
            titular: 'Titular',
            rotacion: 'Rotación',
            suplente: 'Suplente',
            no_convocada: 'No Convocada'
        }
        return labels[status] || status
    }

    const getRecommendationLabel = (next: string) => {
        const labels: Record<string, string> = {
            mantener: 'Mantener',
            probar_superior: 'Probar en Categoría Superior',
            trabajar_area: 'Trabajar Área Específica',
            reposo_tecnico: 'Reposo Técnico'
        }
        return labels[next] || next
    }

    const getAverageScore = (scores: Record<string, number>) => {
        const values = Object.values(scores)
        return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">Cargando informes...</div>
            </div>
        )
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="w-6 h-6" />
                    Informes de Evaluación
                </h2>
                {/* DEPRECATED: Flux A - Informes estructurados desde Jugadoras */}
                {/* Este botón ha sido desactivado. Usa las evaluaciones por fase desde el equipo. */}
                {false && (
                    <button
                        onClick={() => setIsFormOpen(true)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!currentTeamId || !currentSeasonId || !canCreateReport}
                        title={!canCreateReport ? permissionMessage : ''}
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo Informe
                    </button>
                )}
            </div>

            {!currentTeamId || !currentSeasonId && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
                    ⚠️ No se pudo cargar el equipo o temporada actual. Por favor, asegúrate de tener una temporada activa y al menos un equipo creado.
                </div>
            )}

            {!canCreateReport && permissionMessage && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                    ⚠️ {permissionMessage}
                </div>
            )}

            {/* DEPRECATED: Flux A - Modal de creación de informes */}
            {false && isFormOpen && playerId && currentTeamId && currentSeasonId && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <PlayerReportForm
                        playerId={playerId as string}
                        teamId={currentTeamId}
                        seasonId={currentSeasonId}
                        onSaved={handleSaved}
                        onCancel={() => setIsFormOpen(false)}
                    />
                </div>
            )}

            {/* Report Details Modal */}
            {selectedReport && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-gray-900">Detalle del Informe</h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    icon={Plus}
                                    onClick={() => setSelectedReport(null)}
                                    className="p-2 rotate-45"
                                >
                                    {''}
                                </Button>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>{formatDate(selectedReport.report_date)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                            {/* Technical Section */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5" />
                                    Evaluación Técnica
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <ScoreItem label="Saque" value={selectedReport.sections.technical.serves} />
                                    <ScoreItem label="Recepción" value={selectedReport.sections.technical.reception} />
                                    <ScoreItem label="Ataque" value={selectedReport.sections.technical.attack} />
                                    <ScoreItem label="Bloqueo" value={selectedReport.sections.technical.block} />
                                    <ScoreItem label="Defensa" value={selectedReport.sections.technical.defense} />
                                    <ScoreItem label="Impacto de Errores" value={selectedReport.sections.technical.errorImpact} />
                                </div>
                            </div>

                            {/* Role Section */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <Users className="w-5 h-5" />
                                    Rol en el Equipo
                                </h4>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <span className="font-medium text-gray-900">
                                        {getRoleLabel(selectedReport.sections.role.status)}
                                    </span>
                                </div>
                            </div>

                            {/* Attitude Section */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <Heart className="w-5 h-5" />
                                    Actitud y Compromiso
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <ScoreItem label="Asistencia" value={selectedReport.sections.attitude.attendance} />
                                    <ScoreItem label="Intensidad" value={selectedReport.sections.attitude.intensity} />
                                    <ScoreItem label="Comunicación" value={selectedReport.sections.attitude.communication} />
                                    <ScoreItem label="Adaptación" value={selectedReport.sections.attitude.adaptation} />
                                </div>
                            </div>

                            {/* Recommendation Section */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <Target className="w-5 h-5" />
                                    Recomendación
                                </h4>
                                <div className="p-3 bg-primary-50 rounded-lg">
                                    <span className="font-medium text-primary-900">
                                        {getRecommendationLabel(selectedReport.sections.recommendation.next)}
                                    </span>
                                </div>
                            </div>

                            {/* Final Comment */}
                            {selectedReport.final_comment && (
                                <div>
                                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Comentario Final</h4>
                                    <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                                        {selectedReport.final_comment}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Reports List */}
            {reports.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-2">No hay informes registrados</p>
                    <p className="text-sm text-gray-500">
                        Crea el primer informe para esta jugadora
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {reports.map((report) => (
                        <div
                            key={report.id}
                            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => setSelectedReport(report)}
                        >
                            {/* Report Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        <span>{formatDate(report.report_date)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                                        {getRoleLabel(report.sections.role.status)}
                                    </span>
                                </div>
                            </div>

                            {/* Quick Stats */}
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="text-center p-3 bg-blue-50 rounded-lg">
                                    <div className="text-sm text-gray-600 mb-1">Técnica</div>
                                    <div className="text-2xl font-bold text-blue-600">
                                        {getAverageScore(report.sections.technical)}
                                    </div>
                                </div>
                                <div className="text-center p-3 bg-green-50 rounded-lg">
                                    <div className="text-sm text-gray-600 mb-1">Actitud</div>
                                    <div className="text-2xl font-bold text-green-600">
                                        {getAverageScore(report.sections.attitude)}
                                    </div>
                                </div>
                                <div className="text-center p-3 bg-purple-50 rounded-lg">
                                    <div className="text-sm text-gray-600 mb-1">Recomendación</div>
                                    <div className="text-xs font-medium text-purple-600 mt-2">
                                        {getRecommendationLabel(report.sections.recommendation.next)}
                                    </div>
                                </div>
                            </div>

                            {/* Comment Preview */}
                            {report.final_comment && (
                                <p className="text-gray-600 text-sm line-clamp-2">
                                    {report.final_comment}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// Helper component for score display
function ScoreItem({ label, value }: { label: string; value: number }) {
    return (
        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span className="text-sm text-gray-700">{label}</span>
            <span className="text-sm font-semibold text-primary-600">{value}/5</span>
        </div>
    )
}

