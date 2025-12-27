import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Filter, Search, Eye, ArrowLeft, Plus } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { playerEvaluationService, PlayerEvaluationDB, PlayerEvaluationInput } from '@/services/playerEvaluationService'
import { seasonService } from '@/services/seasonService'
import { teamService, TeamDB } from '@/services/teamService'
import { PlayerEvaluationModal } from '@/components/teams/PlayerEvaluationModal'
import { CreateEvaluationSelectionModal } from '@/components/teams/CreateEvaluationSelectionModal'
import { Button } from '@/components/ui/Button'
import { useRoleScope } from '@/hooks/useRoleScope'
import { getTeamDisplayName } from '@/utils/teamDisplay'
import { toast } from 'sonner'
import { PlayerDB } from '@/services/playerService'
import { SeasonDB } from '@/services/seasonService'

const PHASE_LABELS = {
    start: 'Inicio',
    mid: 'Mitad',
    end: 'Final'
}

const PHASE_COLORS: Record<string, string> = {
    start: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    mid: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    end: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
}

export function DTReportsPage() {
    const navigate = useNavigate()
    const { profile } = useAuthStore()
    const { isCoach, isDT, assignedTeamIds } = useRoleScope()

    const [evaluations, setEvaluations] = useState<PlayerEvaluationDB[]>([])
    const [filteredEvaluations, setFilteredEvaluations] = useState<PlayerEvaluationDB[]>([])
    const [loading, setLoading] = useState(true)

    // Filter state
    const [selectedTeamId, setSelectedTeamId] = useState<string>('')
    const [selectedSeasonId, setSelectedSeasonId] = useState<string>('')
    const [selectedPhase, setSelectedPhase] = useState<string>('')
    const [searchTerm, setSearchTerm] = useState('')

    // Data for filters
    const [seasons, setSeasons] = useState<SeasonDB[]>([])
    const [teams, setTeams] = useState<TeamDB[]>([])

    // Modal state
    const [createSelectionOpen, setCreateSelectionOpen] = useState(false)
    const [evaluationModalOpen, setEvaluationModalOpen] = useState(false)
    const [modalMode, setModalMode] = useState<'view' | 'edit'>('view')
    const [selectedEvaluation, setSelectedEvaluation] = useState<PlayerEvaluationDB | null>(null)
    const [creationContext, setCreationContext] = useState<{
        player: PlayerDB
        team: TeamDB
        season: SeasonDB
        phase: 'start' | 'mid' | 'end'
    } | null>(null)

    const loadData = useCallback(async () => {
        if (!profile?.club_id) return

        try {
            setLoading(true)

            // Get seasons
            const seasonsData = await seasonService.getSeasonsByClub(profile.club_id)
            setSeasons(seasonsData)

            // Get teams
            let teamsData = await teamService.getTeamsByClub(profile.club_id)

            if (isCoach) {
                // Ensure assignedTeamIds is valid before filtering
                if (assignedTeamIds && assignedTeamIds.length > 0) {
                    teamsData = teamsData.filter(team => assignedTeamIds.includes(team.id))
                } else if (!isDT) {
                    // If coach but no assigned teams, show empty? Or maybe wait for assignment load?
                    // Currently keeping logic safe.
                }
            }

            setTeams(teamsData)

            // Get current season if not selected
            if (!selectedSeasonId) {
                let currentSeason = null
                try {
                    currentSeason = await seasonService.getCurrentSeasonByClub(profile.club_id)
                } catch {
                    if (seasonsData.length > 0) {
                        currentSeason = seasonsData[0]
                    }
                }

                if (currentSeason) {
                    setSelectedSeasonId(currentSeason.id)
                }
            }

            // Fetch all evaluations
            let evaluationsData = await playerEvaluationService.getAllEvaluations(profile.club_id)

            if (isCoach) {
                evaluationsData = evaluationsData.filter(evaluation => assignedTeamIds.includes(evaluation.team_id))
            }

            setEvaluations(evaluationsData)
            // Filtered evaluations will be updated by the useEffect dependency

        } catch (error) {
            console.error('Error fetching data:', error)
            toast.error('Error al cargar los informes')
        } finally {
            setLoading(false)
        }
    }, [profile?.club_id, isCoach, isDT, assignedTeamIds, selectedSeasonId])

    // Initial load
    useEffect(() => {
        loadData()
    }, [loadData])

    // Apply filters and group by player
    useEffect(() => {
        let filtered = [...evaluations]

        if (selectedTeamId) {
            filtered = filtered.filter(e => e.team_id === selectedTeamId)
        }

        if (selectedSeasonId) {
            filtered = filtered.filter(e => e.season_id === selectedSeasonId)
        }

        if (selectedPhase) {
            filtered = filtered.filter(e => e.phase === selectedPhase)
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase()
            filtered = filtered.filter(e =>
                // @ts-ignore - joined fields
                e.player?.first_name?.toLowerCase().includes(term) ||
                // @ts-ignore
                e.player?.last_name?.toLowerCase().includes(term)
            )
        }

        // Group by player and keep only the latest evaluation (or all? The usage showing list implies "one per player" in logic, but let's check)
        // Original logic logic grouped by player. Keep it for "Summary View"
        // But if we want to see ALL history? Maybe just filter list.
        // For now, keeping original grouping logic to maintain behavior.
        const playerMap = new Map<string, PlayerEvaluationDB>()

        filtered.forEach(evaluation => {
            const playerId = evaluation.player_id
            const existing = playerMap.get(playerId)

            if (!existing) {
                playerMap.set(playerId, evaluation)
            } else {
                // Keep the most recent evaluation (by created_at)
                if (new Date(evaluation.created_at) > new Date(existing.created_at)) {
                    playerMap.set(playerId, evaluation)
                }
            }
        })

        // Convert map back to array
        const groupedEvaluations = Array.from(playerMap.values())

        setFilteredEvaluations(groupedEvaluations)
    }, [selectedTeamId, selectedSeasonId, selectedPhase, searchTerm, evaluations])

    const handleViewEvaluation = (evaluation: PlayerEvaluationDB) => {
        setSelectedEvaluation(evaluation)
        setCreationContext(null)
        setModalMode('view')
        setEvaluationModalOpen(true)
    }

    const handleCreateStart = () => {
        setCreateSelectionOpen(true)
    }

    const handleCreateSelect = async (data: { team: TeamDB, player: PlayerDB, season: SeasonDB, phase: 'start' | 'mid' | 'end' }) => {
        // Check if exists
        try {
            const existing = await playerEvaluationService.getPlayerEvaluation(
                data.player.id,
                data.team.id,
                data.season.id,
                data.phase
            )

            if (existing) {
                // Determine missing fields to fetch join info if needed?
                // existing probably lacks joined 'player', 'team', 'season' objects if fetched raw.
                // But we have them in `data`.
                const fullExisting = {
                    ...existing,
                    player: data.player,
                    team: data.team,
                    season: data.season
                }
                setSelectedEvaluation(fullExisting as any)
                setCreationContext(null)
                setModalMode('edit')
                toast.info('Ya existe una evaluación para esta fase. Abriendo modo edición.')
            } else {
                setSelectedEvaluation(null)
                setCreationContext(data)
                setModalMode('edit')
            }
            setEvaluationModalOpen(true)
        } catch (error) {
            console.error('Error checking existance:', error)
            toast.error('Error al verificar evaluación existente')
        }
    }

    const handleSaveEvaluation = async (data: PlayerEvaluationInput) => {
        try {
            await playerEvaluationService.upsertEvaluation(data)
            toast.success('Evaluación guardada correctamente')
            setEvaluationModalOpen(false)
            loadData() // Refresh list
        } catch (error) {
            console.error('Error saving:', error)
            toast.error('Error al guardar evaluación')
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Cargando informes...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="sm" onClick={() => navigate('/reports')} className="mr-2">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <FileText className="w-8 h-8 text-primary-600" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Informes de Jugadoras
                                </h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Vista global de evaluaciones de todos los equipos
                                </p>
                            </div>
                        </div>

                        <Button
                            variant="primary"
                            icon={Plus}
                            onClick={handleCreateStart}
                        >
                            Crear Informe
                        </Button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Filter className="w-5 h-5 text-gray-500" />
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filtros</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Search */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Buscar Jugadora
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Nombre o apellido..."
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                        </div>

                        {/* Season Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Temporada
                            </label>
                            <select
                                value={selectedSeasonId}
                                onChange={(e) => setSelectedSeasonId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="">Todas las temporadas</option>
                                {seasons.map((season) => (
                                    <option key={season.id} value={season.id}>
                                        {season.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Team Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Equipo
                            </label>
                            <select
                                value={selectedTeamId}
                                onChange={(e) => setSelectedTeamId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="">Todos los equipos</option>
                                {teams.map((team) => (
                                    <option key={team.id} value={team.id}>
                                        {getTeamDisplayName(team)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Phase Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Fase
                            </label>
                            <select
                                value={selectedPhase}
                                onChange={(e) => setSelectedPhase(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="">Todas las fases</option>
                                <option value="start">Inicio</option>
                                <option value="mid">Mitad</option>
                                <option value="end">Final</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reports List */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {filteredEvaluations.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                No hay evaluaciones
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400">
                                No se encontraron evaluaciones con los filtros seleccionados
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-900">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Jugadora
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Equipo
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Temporada
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Fase
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Fecha
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredEvaluations.map((evaluation) => (
                                        <tr key={evaluation.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {/* @ts-ignore */}
                                                    {evaluation.player?.first_name} {evaluation.player?.last_name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    {/* @ts-ignore */}
                                                    {evaluation.team ? getTeamDisplayName(evaluation.team) : '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    {/* @ts-ignore */}
                                                    {evaluation.season?.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PHASE_COLORS[evaluation.phase]}`}>
                                                    {PHASE_LABELS[evaluation.phase]}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400">
                                                {formatDate(evaluation.created_at)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => handleViewEvaluation(evaluation)}
                                                    className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 flex items-center justify-end gap-1 ml-auto"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    Ver
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Selection Modal */}
            <CreateEvaluationSelectionModal
                isOpen={createSelectionOpen}
                onClose={() => setCreateSelectionOpen(false)}
                teams={teams}
                seasons={seasons}
                currentSeasonId={selectedSeasonId}
                onSelect={handleCreateSelect}
            />

            {/* Evaluation Modal (Edit/View/Create) */}
            {(selectedEvaluation || creationContext) && (
                <PlayerEvaluationModal
                    isOpen={evaluationModalOpen}
                    onClose={() => {
                        setEvaluationModalOpen(false)
                        setSelectedEvaluation(null)
                        setCreationContext(null)
                    }}
                    // @ts-ignore
                    player={selectedEvaluation?.player || creationContext?.player}
                    // @ts-ignore
                    team={selectedEvaluation?.team || creationContext?.team}
                    // @ts-ignore
                    season={selectedEvaluation?.season || creationContext?.season}
                    phase={(selectedEvaluation?.phase || creationContext?.phase || 'start')}
                    existingEvaluation={selectedEvaluation}
                    onSave={handleSaveEvaluation}
                    mode={modalMode}
                />
            )}
        </div>
    )
}
