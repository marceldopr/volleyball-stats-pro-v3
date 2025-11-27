import { useState, useEffect } from 'react'
import { Trash2, X, Search, UserPlus, Eye, AlertTriangle, Filter } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole'
import { TeamDB } from '@/services/teamService'
import { SeasonDB } from '@/services/seasonService'
import { playerService, PlayerDB } from '@/services/playerService'
import { playerTeamSeasonService, PlayerTeamSeasonDB } from '@/services/playerTeamSeasonService'
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
}

export function TeamRosterManager({ team, season, onClose }: TeamRosterManagerProps) {
    const { profile } = useAuthStore()
    const { isCoach } = useCurrentUserRole()
    const isReadOnly = isCoach
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

            // 3. Merge data
            const fullRoster = rosterData.map(item => ({
                ...item,
                player: allPlayers.find(p => p.id === item.player_id)
            }))

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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-gray-900">Plantilla: {team.name}</h2>
                        {isReadOnly && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                <Eye className="w-3 h-3" />
                                Solo lectura
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-500">{season.name} - {team.category_stage} {team.gender === 'female' ? 'Fem' : team.gender === 'male' ? 'Masc' : 'Mixto'}</p>
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
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    )}
                </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex flex-col justify-center items-center h-full text-gray-500 gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                        <p>Cargando plantilla...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dorsal</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Posición</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                    {!isReadOnly && (
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {roster.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                            {item.jersey_number || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {item.player ? `${item.player.first_name} ${item.player.last_name}` : 'Jugadora desconocida'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {item.player ? (
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.player.main_position === 'L' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                    {POSITION_NAMES[item.player.main_position as keyof typeof POSITION_NAMES]}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {item.status === 'active' ? 'Activa' : item.status}
                                            </span>
                                        </td>
                                        {!isReadOnly && (
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <button
                                                    onClick={() => handleRemovePlayer(item.id)}
                                                    className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-full"
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
                                        <td colSpan={isReadOnly ? 4 : 5} className="px-6 py-12 text-center text-gray-500">
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
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">Añadir Jugadora</h2>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddPlayer} className="p-6 space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-sm font-medium text-gray-700">Buscar Jugadora</label>
                                    <button
                                        type="button"
                                        onClick={() => setShowIncompatible(!showIncompatible)}
                                        className={`text-xs flex items-center gap-1 ${showIncompatible ? 'text-orange-600' : 'text-gray-500'}`}
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
                                        className="input pl-10 w-full mb-2"
                                    />
                                </div>
                                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                                    {filteredAvailablePlayers.length === 0 ? (
                                        <div className="p-4 text-center text-sm text-gray-500">
                                            Sin jugadoras disponibles para este equipo
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-gray-100">
                                            {filteredAvailablePlayers.map(p => (
                                                <div
                                                    key={p.id}
                                                    onClick={() => p.compatibility.compatible && setSelectedPlayerId(p.id)}
                                                    className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${selectedPlayerId === p.id ? 'bg-orange-50 border-l-4 border-orange-500' : 'hover:bg-gray-50'
                                                        } ${!p.compatibility.compatible ? 'opacity-60 cursor-not-allowed bg-gray-50' : ''}`}
                                                >
                                                    <div>
                                                        <div className="font-medium text-sm text-gray-900">
                                                            {p.first_name} {p.last_name}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {p.main_position} • {p.gender === 'female' ? 'Fem' : 'Masc'} • {p.birth_date ? new Date(p.birth_date).getFullYear() : 'Sin fecha'}
                                                        </div>
                                                    </div>
                                                    {!p.compatibility.compatible && (
                                                        <div className="text-xs text-red-600 flex items-center gap-1" title={p.compatibility.issues.join(', ')}>
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Dorsal</label>
                                    <input
                                        type="text"
                                        value={addFormData.jersey_number}
                                        onChange={(e) => setAddFormData({ ...addFormData, jersey_number: e.target.value })}
                                        className="input w-full"
                                        placeholder="#"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                                    <select
                                        value={addFormData.status}
                                        onChange={(e) => setAddFormData({ ...addFormData, status: e.target.value })}
                                        className="input w-full"
                                    >
                                        <option value="active">Activa</option>
                                        <option value="injured">Lesionada</option>
                                        <option value="inactive">Inactiva</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="btn-secondary"
                                    disabled={adding}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={adding || !selectedPlayerId}
                                >
                                    {adding ? 'Añadiendo...' : 'Añadir'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
