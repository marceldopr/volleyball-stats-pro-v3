import { useState, useEffect } from 'react'
import { Trash2, X, Search, UserPlus, Eye, AlertTriangle, Filter } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole'
import { TeamDB } from '@/services/teamService'
import { SeasonDB } from '@/services/seasonService'
import { playerService, PlayerDB } from '@/services/playerService'
import { playerTeamSeasonService, PlayerTeamSeasonDB } from '@/services/playerTeamSeasonService'
import { playerEvaluationService, PlayerEvaluationDB, PlayerEvaluationInput } from '@/services/playerEvaluationService'
import { getTeamDisplayName } from '@/utils/teamDisplay'
import { EvaluationChips } from './EvaluationChips'
import { PlayerEvaluationModal } from './PlayerEvaluationModal'
import { toast } from 'sonner'
import { POSITION_NAMES } from '@/constants'
import { getCategoryStageFromBirthDate, getStageIndex } from '@/utils/categoryStage'

interface TeamRosterManagerProps {
    team: TeamDB
    season: SeasonDB
    onClose?: () => void
}

interface RosterItem extends PlayerTeamSeasonDB {
    player?: PlayerDB
    evaluations?: {
        start?: PlayerEvaluationDB
        mid?: PlayerEvaluationDB
        end?: PlayerEvaluationDB
    }
}

export function TeamRosterManager({ team, season, onClose }: TeamRosterManagerProps) {
    const { profile } = useAuthStore()
    const { isDT, isAdmin, isCoach, assignedTeamIds } = useCurrentUserRole()

    // Permission logic
    const canEditAllFields = isDT || isAdmin
    const canEditLimitedFields = isCoach && assignedTeamIds.includes(team.id)
    const canEditEvaluations = canEditAllFields || canEditLimitedFields
    const isReadOnly = !canEditAllFields && !canEditLimitedFields

    const [roster, setRoster] = useState<RosterItem[]>([])
    const [loading, setLoading] = useState(true)

    // Add Player Modal State
    const [showAddModal, setShowAddModal] = useState(false)
    const [availablePlayers, setAvailablePlayers] = useState<PlayerDB[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set())
    const [showIncompatible, setShowIncompatible] = useState(false)
    const [strictCategoryMatch, setStrictCategoryMatch] = useState(true)
    // Removed addFormData as per request (adding with defaults)
    const [adding, setAdding] = useState(false)

    // Inline Jersey Edit State
    const [editingJerseyId, setEditingJerseyId] = useState<string | null>(null)
    const [editingJerseyValue, setEditingJerseyValue] = useState('')
    const [savingJersey, setSavingJersey] = useState(false)

    // Inline Position Edit State
    const [editingPositionId, setEditingPositionId] = useState<string | null>(null)
    const [editingPositionValue, setEditingPositionValue] = useState('')
    const [savingPosition, setSavingPosition] = useState(false)

    // Inline Status Edit State
    const [editingStatusId, setEditingStatusId] = useState<string | null>(null)
    const [editingStatusValue, setEditingStatusValue] = useState<'active' | 'inactive' | 'lesionada'>('active')
    const [savingStatus, setSavingStatus] = useState(false)

    // Evaluation Modal State
    const [evaluationModalOpen, setEvaluationModalOpen] = useState(false)
    const [selectedPlayer, setSelectedPlayer] = useState<PlayerDB | null>(null)
    const [selectedPhase, setSelectedPhase] = useState<'start' | 'mid' | 'end'>('start')
    const [selectedEvaluation, setSelectedEvaluation] = useState<PlayerEvaluationDB | null>(null)

    const [assignedPlayerIds, setAssignedPlayerIds] = useState<Set<string>>(new Set())

    useEffect(() => {
        loadRoster()
    }, [team.id, season.id])

    const loadRoster = async () => {
        if (!profile?.club_id) return
        setLoading(true)
        try {
            // 1. Get roster links for THIS team
            const rosterData = await playerTeamSeasonService.getRosterByTeamAndSeason(team.id, season.id)

            // 2. Get ALL assignments for the season (to exclude players already in other teams)
            const allAssignments = await playerTeamSeasonService.getPlayerAssignmentsBySeasonWithTeams(season.id)
            const otherTeamAssignments = allAssignments.filter(a => a.team_id !== team.id)
            setAssignedPlayerIds(new Set(otherTeamAssignments.map(a => a.player_id)))

            // 3. Get all players to map names
            const allPlayers = await playerService.getPlayersByClub(profile.club_id)

            // 4. Get all evaluations for this team/season
            const evaluations = await playerEvaluationService.getEvaluationsByTeamSeason(team.id, season.id)

            // 5. Merge data
            const fullRoster = rosterData.map(item => {
                const player = allPlayers.find(p => p.id === item.player_id)
                const playerEvals = evaluations.filter(e => e.player_id === item.player_id)

                return {
                    ...item,
                    player,
                    evaluations: {
                        start: playerEvals.find(e => e.phase === 'start'),
                        mid: playerEvals.find(e => e.phase === 'mid'),
                        end: playerEvals.find(e => e.phase === 'end')
                    }
                }
            })

            setRoster(fullRoster)
            setAvailablePlayers(allPlayers)
        } catch (error) {
            console.error('Error loading roster:', error)
            toast.error('Error al cargar la plantilla')
        } finally {
            setLoading(false)
        }
    }

    const checkCompatibility = (player: PlayerDB) => {
        const issues: string[] = []

        // 1. Gender Check
        if (team.gender !== 'mixed') {
            if (team.gender === 'female' && player.gender !== 'female') {
                issues.push('Género incompatible (Equipo Femenino)')
            } else if (team.gender === 'male' && player.gender !== 'male') {
                issues.push('Género incompatible (Equipo Masculino)')
            }
        }

        // 2. Category Check
        if (player.birth_date && season.reference_date) {
            const playerStage = getCategoryStageFromBirthDate(player.birth_date, new Date(season.reference_date))
            const playerStageIndex = getStageIndex(playerStage)
            const teamStageIndex = getStageIndex(team.category_stage)

            // Player cannot play in a lower category (e.g. Senior cannot play in Junior)
            // But Junior CAN play in Senior (playing up)
            if (playerStageIndex > teamStageIndex) {
                issues.push(`Categoría incompatible (${playerStage} > ${team.category_stage})`)
            }
        }

        return {
            compatible: issues.length === 0,
            issues
        }
    }

    // Helper to check for duplicate jersey number
    const isJerseyDuplicate = (jerseyNumber: string, excludeId?: string) => {
        if (!jerseyNumber.trim()) return false
        return roster.some(r =>
            r.jersey_number === jerseyNumber.trim() &&
            (excludeId ? r.id !== excludeId : true)
        )
    }

    const togglePlayerSelection = (playerId: string) => {
        const newSelected = new Set(selectedPlayerIds)
        if (newSelected.has(playerId)) {
            newSelected.delete(playerId)
        } else {
            newSelected.add(playerId)
        }
        setSelectedPlayerIds(newSelected)
    }

    const handleAddPlayers = async (e: React.FormEvent) => {
        e.preventDefault()
        if (selectedPlayerIds.size === 0) return

        setAdding(true)
        try {
            const promises = Array.from(selectedPlayerIds).map(playerId =>
                playerTeamSeasonService.addPlayerToTeamSeason({
                    player_id: playerId,
                    team_id: team.id,
                    season_id: season.id,
                    jersey_number: undefined,
                    role: 'starter', // Default internal role
                    position: undefined,
                    status: 'active',
                    notes: ''
                })
            )

            await Promise.all(promises)

            toast.success(`${selectedPlayerIds.size} jugadoras añadidas al equipo`)
            setShowAddModal(false)
            setSelectedPlayerIds(new Set())
            loadRoster()
        } catch (error) {
            toast.error('Error al añadir jugadoras')
            console.error(error)
        } finally {
            setAdding(false)
        }
    }

    // Handle inline jersey number edit
    const handleStartEditJersey = (item: RosterItem) => {
        setEditingJerseyId(item.id)
        setEditingJerseyValue(item.jersey_number || '')
    }

    const handleCancelEditJersey = () => {
        setEditingJerseyId(null)
        setEditingJerseyValue('')
    }

    const handleSaveJersey = async () => {
        if (!editingJerseyId) return

        // Check for duplicate
        if (editingJerseyValue && isJerseyDuplicate(editingJerseyValue, editingJerseyId)) {
            toast.error(`El dorsal ${editingJerseyValue} ya está asignado`)
            return
        }

        setSavingJersey(true)
        try {
            await playerTeamSeasonService.updatePlayerInTeamSeason(editingJerseyId, {
                jersey_number: editingJerseyValue.trim() || null
            })
            toast.success('Dorsal actualizado')
            setEditingJerseyId(null)
            setEditingJerseyValue('')
            loadRoster()
        } catch (error) {
            toast.error('Error al actualizar dorsal')
        } finally {
            setSavingJersey(false)
        }
    }

    // Handle inline position edit
    const handleStartEditPosition = (item: RosterItem) => {
        setEditingPositionId(item.id)
        setEditingPositionValue(item.position || '')
    }

    const handleCancelEditPosition = () => {
        setEditingPositionId(null)
        setEditingPositionValue('')
    }

    const handleSavePosition = async () => {
        if (!editingPositionId) return

        setSavingPosition(true)
        try {
            await playerTeamSeasonService.updatePlayerInTeamSeason(editingPositionId, {
                position: editingPositionValue || null
            })
            toast.success('Posición actualizada')
            setEditingPositionId(null)
            setEditingPositionValue('')
            loadRoster()
        } catch (error) {
            toast.error('Error al actualizar posición')
            console.error(error)
        } finally {
            setSavingPosition(false)
        }
    }

    // Handle inline status edit
    const handleStartEditStatus = (item: RosterItem) => {
        setEditingStatusId(item.id)
        setEditingStatusValue((item.status as 'active' | 'inactive') || 'active')
    }

    const handleCancelEditStatus = () => {
        setEditingStatusId(null)
    }

    const handleSaveStatus = async () => {
        if (!editingStatusId) return

        setSavingStatus(true)
        try {
            await playerTeamSeasonService.updatePlayerInTeamSeason(editingStatusId, {
                status: editingStatusValue
            })
            toast.success(`Estado actualizado a ${editingStatusValue === 'active' ? 'Activa' : 'Inactiva'}`)
            setEditingStatusId(null)
            loadRoster()
        } catch (error) {
            toast.error('Error al actualizar estado')
            console.error(error)
        } finally {
            setSavingStatus(false)
        }
    }


    const handleRemovePlayer = async (id: string) => {
        if (!window.confirm('¿Estás seguro de quitar a esta jugadora del equipo?')) return

        try {
            await playerTeamSeasonService.removePlayerFromTeamSeason(id)
            toast.success('Jugadora eliminada del equipo')
            loadRoster()
        } catch (error) {
            toast.error('Error al eliminar jugadora')
        }
    }

    const handleEvaluationClick = (player: PlayerDB, phase: 'start' | 'mid' | 'end', existingEvaluation?: PlayerEvaluationDB) => {
        setSelectedPlayer(player)
        setSelectedPhase(phase)
        setSelectedEvaluation(existingEvaluation || null)
        setEvaluationModalOpen(true)
    }

    const handleSaveEvaluation = async (data: PlayerEvaluationInput) => {
        try {
            await playerEvaluationService.upsertEvaluation(data)
            toast.success('Evaluación guardada correctamente')
            loadRoster() // Reload to show updated chips
        } catch (error) {
            console.error('Error saving evaluation:', error)
            toast.error('Error al guardar la evaluación')
            throw error
        }
    }

    // Filter available players
    const filteredAvailablePlayers = availablePlayers
        .filter(p => p.is_active) // Only active players
        .filter(p => !roster.some(r => r.player_id === p.id)) // Not in *this* team
        .filter(p => !assignedPlayerIds.has(p.id)) // Not in *other* teams
        .filter(p =>
            p.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.last_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .map(p => {
            // Calculate compatibility & category match
            let isStrictMatch = false
            const compatibility = checkCompatibility(p)

            if (p.birth_date && season.reference_date) {
                const playerStage = getCategoryStageFromBirthDate(p.birth_date, new Date(season.reference_date))
                isStrictMatch = playerStage === team.category_stage
            } else {
                // Fallback if no dates: Check compatibility only
                isStrictMatch = compatibility.compatible // or false strict? Let's say false unless known.
            }

            return {
                ...p,
                compatibility,
                isStrictMatch
            }
        })
        .filter(p => {
            // Priority 1: Incompatible View
            if (showIncompatible) return true // Show everything

            // Priority 2: Compatibility Check (Must be compatible)
            if (!p.compatibility.compatible) return false

            // Priority 3: Strict Match Check
            if (strictCategoryMatch) return p.isStrictMatch

            return true
        })

    return (
        <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 overflow-hidden min-h-[500px] flex flex-col">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-white">Plantilla: {getTeamDisplayName(team)}</h2>
                        {isReadOnly && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-blue-900/30 text-blue-200 text-xs font-medium rounded-full border border-blue-800">
                                <Eye className="w-3 h-3" />
                                Solo lectura
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-400">{season.name} - {team.category_stage} {team.gender === 'female' ? 'Fem' : team.gender === 'male' ? 'Masc' : 'Mixto'}</p>
                </div>
                <div className="flex gap-2">
                    {!isReadOnly && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="btn-primary flex items-center gap-2"
                        >
                            <UserPlus className="w-4 h-4" />
                            <span>Añadir Jugadora</span>
                        </button>
                    )}
                    {onClose && (
                        <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg">
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    )}
                </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex flex-col justify-center items-center h-full text-gray-400 gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                        <p>Cargando plantilla...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-900/50 border-b border-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Dorsal</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Nombre</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Posición</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Estado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Evaluación</th>
                                    {canEditAllFields && (
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Acciones</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {roster.map((item) => (
                                    <tr
                                        key={item.id}
                                        className={`transition-colors ${item.status === 'inactive'
                                            ? 'opacity-50 hover:bg-gray-700/30'
                                            : 'hover:bg-gray-700/50'
                                            }`}
                                    >
                                        <td className="px-6 py-2.5 whitespace-nowrap font-medium text-white">
                                            {editingJerseyId === item.id ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={editingJerseyValue}
                                                        onChange={(e) => setEditingJerseyValue(e.target.value)}
                                                        className={`w-16 bg-gray-900 border rounded px-2 py-1 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${editingJerseyValue && isJerseyDuplicate(editingJerseyValue, item.id)
                                                            ? 'border-red-500'
                                                            : 'border-gray-600'
                                                            }`}
                                                        placeholder="#"
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleSaveJersey()
                                                            if (e.key === 'Escape') handleCancelEditJersey()
                                                        }}
                                                    />
                                                    <button
                                                        onClick={handleSaveJersey}
                                                        disabled={savingJersey || !!(editingJerseyValue && isJerseyDuplicate(editingJerseyValue, item.id))}
                                                        className="text-green-400 hover:text-green-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title="Guardar"
                                                    >
                                                        ✓
                                                    </button>
                                                    <button
                                                        onClick={handleCancelEditJersey}
                                                        className="text-gray-400 hover:text-gray-300"
                                                        title="Cancelar"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => !isReadOnly && handleStartEditJersey(item)}
                                                    className={`group flex items-center gap-2 ${!isReadOnly ? 'hover:text-blue-400 cursor-pointer' : ''}`}
                                                    disabled={isReadOnly}
                                                >
                                                    <span>{item.jersey_number || '-'}</span>
                                                    {!isReadOnly && (
                                                        <span className="opacity-0 group-hover:opacity-100 text-gray-500 text-sm">✎</span>
                                                    )}
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-6 py-2.5 whitespace-nowrap text-gray-200">
                                            <div className="flex items-center gap-2">
                                                <span>{item.player ? `${item.player.first_name} ${item.player.last_name}` : 'Jugadora desconocida'}</span>
                                                {item.status === 'lesionada' && (
                                                    <span className="text-red-400 text-sm font-bold" title="Lesionada">✖</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-2.5 whitespace-nowrap">
                                            {editingPositionId === item.id ? (
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={editingPositionValue}
                                                        onChange={(e) => setEditingPositionValue(e.target.value)}
                                                        className="w-32 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleSavePosition()
                                                            if (e.key === 'Escape') handleCancelEditPosition()
                                                        }}
                                                    >
                                                        <option value="">Sin asignar</option>
                                                        {Object.entries(POSITION_NAMES).map(([key, label]) => (
                                                            <option key={key} value={key}>{label}</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        onClick={handleSavePosition}
                                                        disabled={savingPosition}
                                                        className="text-green-400 hover:text-green-300 disabled:opacity-50"
                                                    >
                                                        ✓
                                                    </button>
                                                    <button
                                                        onClick={handleCancelEditPosition}
                                                        className="text-gray-400 hover:text-gray-300"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ) : (
                                                <div
                                                    onClick={() => !isReadOnly && handleStartEditPosition(item)}
                                                    className={`cursor-pointer group flex items-center gap-2 ${!isReadOnly ? 'hover:bg-gray-700/50 rounded px-2 py-1 -ml-2' : ''}`}
                                                >
                                                    {item.position ? (
                                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${item.position === 'L' ? 'bg-yellow-900/30 text-yellow-200 border border-yellow-700/30' : 'bg-blue-900/30 text-blue-200 border border-blue-700/30'
                                                            }`}>
                                                            {POSITION_NAMES[item.position as keyof typeof POSITION_NAMES]}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-500 text-xs italic">Sin asignar</span>
                                                    )}
                                                    {!isReadOnly && (
                                                        <span className="text-gray-500 opacity-0 group-hover:opacity-100 text-sm">✎</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-2.5 whitespace-nowrap">
                                            {editingStatusId === item.id ? (
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={editingStatusValue}
                                                        onChange={(e) => setEditingStatusValue(e.target.value as 'active' | 'inactive' | 'lesionada')}
                                                        className="w-28 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleSaveStatus()
                                                            if (e.key === 'Escape') handleCancelEditStatus()
                                                        }}
                                                    >
                                                        <option value="active">Activa</option>
                                                        <option value="inactive">Inactiva</option>
                                                        <option value="lesionada">Lesionada</option>
                                                    </select>
                                                    <button
                                                        onClick={handleSaveStatus}
                                                        disabled={savingStatus}
                                                        className="text-green-400 hover:text-green-300 disabled:opacity-50"
                                                        title="Guardar"
                                                    >
                                                        ✓
                                                    </button>
                                                    <button
                                                        onClick={handleCancelEditStatus}
                                                        className="text-gray-400 hover:text-gray-300"
                                                        title="Cancelar"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => !isReadOnly && handleStartEditStatus(item)}
                                                        className={`group px-2 py-0.5 text-xs font-semibold rounded-full transition-colors ${item.status === 'lesionada'
                                                            ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                                                            : item.status === 'inactive'
                                                                ? 'bg-gray-700/30 text-gray-400 border border-gray-600/30'
                                                                : 'bg-green-900/30 text-green-200 border border-green-700/30'
                                                            } ${!isReadOnly ? 'hover:border-blue-500/50 cursor-pointer' : 'cursor-default'}`}
                                                        disabled={isReadOnly}
                                                        title={!isReadOnly ? 'Click para cambiar' : ''}
                                                    >
                                                        {item.status === 'lesionada' ? 'Lesionada' : item.status === 'inactive' ? 'Inactiva' : 'Activa'}
                                                    </button>
                                                    {!isReadOnly && (
                                                        <span className="opacity-0 group-hover:opacity-100 text-gray-500 text-sm">✎</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-2.5 whitespace-nowrap">
                                            {item.player && item.evaluations && (
                                                <EvaluationChips
                                                    evaluations={item.evaluations}
                                                    onChipClick={(type) => handleEvaluationClick(
                                                        item.player!,
                                                        type,
                                                        item.evaluations![type]
                                                    )}
                                                    canEdit={canEditEvaluations}
                                                />
                                            )}
                                        </td>
                                        {canEditAllFields && (
                                            <td className="px-6 py-2.5 whitespace-nowrap text-right">
                                                <button
                                                    onClick={() => handleRemovePlayer(item.id)}
                                                    className="text-red-400 hover:text-red-300 p-2 hover:bg-red-900/20 rounded-full transition-colors"
                                                    title="Quitar del equipo"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {roster.length === 0 && (
                                    <tr>
                                        <td colSpan={canEditAllFields ? 6 : 5} className="px-6 py-12 text-center text-gray-500">
                                            No hay jugadoras en este equipo todavía.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Player Modal */}
            {
                showAddModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                        <div className="bg-gray-800 rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-gray-700">
                            <div className="flex items-center justify-between p-6 border-b border-gray-700">
                                <h2 className="text-xl font-semibold text-white">Añadir Jugadora</h2>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>

                            <form onSubmit={handleAddPlayers} className="p-6 space-y-4">
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-sm font-medium text-gray-300">
                                            Selecciona Jugadoras ({selectedPlayerIds.size})
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={strictCategoryMatch}
                                                    onChange={(e) => setStrictCategoryMatch(e.target.checked)}
                                                    className="rounded border-gray-600 bg-gray-700 text-primary-500 focus:ring-offset-gray-900"
                                                />
                                                <span className="text-xs text-gray-400">Solo {team.category_stage}</span>
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setShowIncompatible(!showIncompatible)}
                                                className={`text-xs flex items-center gap-1 ${showIncompatible ? 'text-orange-400' : 'text-gray-500'}`}
                                            >
                                                <Filter className="w-3 h-3" />
                                                {showIncompatible ? 'Ocultar incompatibles' : 'Mostrar incompatibles'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Buscar por nombre..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-2"
                                        />
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto border border-gray-700 rounded-md bg-gray-900/50">
                                        {filteredAvailablePlayers.length === 0 ? (
                                            <div className="p-4 text-center text-sm text-gray-500">
                                                Sin jugadoras disponibles para este equipo
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-gray-700">
                                                {filteredAvailablePlayers.map(p => (
                                                    <div
                                                        key={p.id}
                                                        onClick={() => p.compatibility.compatible && togglePlayerSelection(p.id)}
                                                        className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${selectedPlayerIds.has(p.id)
                                                            ? 'bg-primary-900/40 border-l-4 border-primary-500'
                                                            : 'hover:bg-gray-700/50'
                                                            } ${!p.compatibility.compatible ? 'opacity-60 cursor-not-allowed bg-gray-900' : ''}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedPlayerIds.has(p.id)
                                                                ? 'bg-primary-500 border-primary-500'
                                                                : 'border-gray-500'
                                                                }`}>
                                                                {selectedPlayerIds.has(p.id) && (
                                                                    <span className="text-white text-xs">✓</span>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-sm text-gray-200">
                                                                    {p.first_name} {p.last_name}
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    {p.main_position} • {p.gender === 'female' ? 'Fem' : 'Masc'} • {p.birth_date ? new Date(p.birth_date).getFullYear() : 'Sin fecha'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {!p.compatibility.compatible && (
                                                            <div className="text-xs text-red-400 flex items-center gap-1" title={p.compatibility.issues.join(', ')}>
                                                                <AlertTriangle className="w-3 h-3" />
                                                                Incompatible
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-700 mt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="text-gray-300 hover:text-white hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors border border-gray-600"
                                        disabled={adding}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="bg-primary-500 hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={adding || selectedPlayerIds.size === 0}
                                    >
                                        {adding ? 'Añadiendo...' : `Añadir (${selectedPlayerIds.size})`}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Evaluation Modal */}
            {
                selectedPlayer && (
                    <PlayerEvaluationModal
                        isOpen={evaluationModalOpen}
                        onClose={() => {
                            setEvaluationModalOpen(false)
                            setSelectedPlayer(null)
                            setSelectedEvaluation(null)
                        }}
                        player={selectedPlayer}
                        team={team}
                        season={season}
                        phase={selectedPhase}
                        existingEvaluation={selectedEvaluation}
                        onSave={handleSaveEvaluation}
                        mode="edit"
                    />
                )
            }
        </div >
    )
}
