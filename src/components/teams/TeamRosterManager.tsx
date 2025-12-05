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
    const [selectedPlayerId, setSelectedPlayerId] = useState<string>('')
    const [showIncompatible, setShowIncompatible] = useState(false)
    const [addFormData, setAddFormData] = useState({
        jersey_number: '',
        role: 'starter',
        status: 'active',
        notes: ''
    })
    const [adding, setAdding] = useState(false)

    // Evaluation Modal State
    const [evaluationModalOpen, setEvaluationModalOpen] = useState(false)
    const [selectedPlayer, setSelectedPlayer] = useState<PlayerDB | null>(null)
    const [selectedPhase, setSelectedPhase] = useState<'start' | 'mid' | 'end'>('start')
    const [selectedEvaluation, setSelectedEvaluation] = useState<PlayerEvaluationDB | null>(null)

    useEffect(() => {
        loadRoster()
    }, [team.id, season.id])

    const loadRoster = async () => {
        if (!profile?.club_id) return
        setLoading(true)
        try {
            // 1. Get roster links
            const rosterData = await playerTeamSeasonService.getRosterByTeamAndSeason(team.id, season.id)

            // 2. Get all players to map names (optimization: could fetch only needed IDs, but for now fetch all active)
            const allPlayers = await playerService.getPlayersByClub(profile.club_id)

            // 3. Get all evaluations for this team/season
            const evaluations = await playerEvaluationService.getEvaluationsByTeamSeason(team.id, season.id)

            // 4. Merge data
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

    const handleAddPlayer = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedPlayerId) return

        setAdding(true)
        try {
            await playerTeamSeasonService.addPlayerToTeamSeason({
                player_id: selectedPlayerId,
                team_id: team.id,
                season_id: season.id,
                ...addFormData
            })
            toast.success('Jugadora añadida al equipo')
            setShowAddModal(false)
            setAddFormData({ jersey_number: '', role: 'starter', status: 'active', notes: '' })
            setSelectedPlayerId('')
            loadRoster()
        } catch (error) {
            toast.error('Error al añadir jugadora')
        } finally {
            setAdding(false)
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
        .filter(p => !roster.some(r => r.player_id === p.id))
        .filter(p =>
            p.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.last_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .map(p => ({
            ...p,
            compatibility: checkCompatibility(p)
        }))
        .filter(p => showIncompatible || p.compatibility.compatible)

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
                                    <tr key={item.id} className="hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-white">
                                            {item.jersey_number || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-200">
                                            {item.player ? `${item.player.first_name} ${item.player.last_name}` : 'Jugadora desconocida'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {item.player ? (
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.player.main_position === 'L' ? 'bg-yellow-900/30 text-yellow-200 border border-yellow-700/30' : 'bg-blue-900/30 text-blue-200 border border-blue-700/30'
                                                    }`}>
                                                    {POSITION_NAMES[item.player.main_position as keyof typeof POSITION_NAMES]}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.status === 'active' ? 'bg-green-900/30 text-green-200 border border-green-700/30' : 'bg-red-900/30 text-red-200 border border-red-700/30'
                                                }`}>
                                                {item.status === 'active' ? 'Activa' : item.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
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
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
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
            {showAddModal && (
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

                        <form onSubmit={handleAddPlayer} className="p-6 space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-sm font-medium text-gray-300">Buscar Jugadora</label>
                                    <button
                                        type="button"
                                        onClick={() => setShowIncompatible(!showIncompatible)}
                                        className={`text-xs flex items-center gap-1 ${showIncompatible ? 'text-orange-400' : 'text-gray-500'}`}
                                    >
                                        <Filter className="w-3 h-3" />
                                        {showIncompatible ? 'Ocultar incompatibles' : 'Mostrar incompatibles'}
                                    </button>
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
                                <div className="max-h-60 overflow-y-auto border border-gray-700 rounded-md bg-gray-900/50">
                                    {filteredAvailablePlayers.length === 0 ? (
                                        <div className="p-4 text-center text-sm text-gray-500">
                                            Sin jugadoras disponibles para este equipo
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-gray-700">
                                            {filteredAvailablePlayers.map(p => (
                                                <div
                                                    key={p.id}
                                                    onClick={() => p.compatibility.compatible && setSelectedPlayerId(p.id)}
                                                    className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${selectedPlayerId === p.id ? 'bg-orange-900/20 border-l-4 border-orange-500' : 'hover:bg-gray-700/50'
                                                        } ${!p.compatibility.compatible ? 'opacity-60 cursor-not-allowed bg-gray-900' : ''}`}
                                                >
                                                    <div>
                                                        <div className="font-medium text-sm text-gray-200">
                                                            {p.first_name} {p.last_name}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {p.main_position} • {p.gender === 'female' ? 'Fem' : 'Masc'} • {p.birth_date ? new Date(p.birth_date).getFullYear() : 'Sin fecha'}
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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Dorsal</label>
                                    <input
                                        type="text"
                                        value={addFormData.jersey_number}
                                        onChange={(e) => setAddFormData({ ...addFormData, jersey_number: e.target.value })}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        placeholder="#"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Estado</label>
                                    <select
                                        value={addFormData.status}
                                        onChange={(e) => setAddFormData({ ...addFormData, status: e.target.value })}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    >
                                        <option value="active">Activa</option>
                                        <option value="injured">Lesionada</option>
                                        <option value="inactive">Inactiva</option>
                                    </select>
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
                                    disabled={adding || !selectedPlayerId}
                                >
                                    {adding ? 'Añadiendo...' : 'Añadir'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Evaluation Modal */}
            {selectedPlayer && (
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
            )}
        </div>
    )
}
