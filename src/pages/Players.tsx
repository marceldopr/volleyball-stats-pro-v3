import { useState, useEffect } from 'react'
import { Plus, Search, Edit, X, Loader2, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { playerService, PlayerDB } from '@/services/playerService'
import { playerTeamSeasonService } from '@/services/playerTeamSeasonService'
import { seasonService } from '@/services/seasonService'
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole'
import { toast } from 'sonner'
import { POSITION_NAMES } from '@/constants'

export function Players() {
    const navigate = useNavigate()
    const { profile } = useAuthStore()
    const { isCoach, assignedTeamIds, loading: roleLoading } = useCurrentUserRole()
    const [players, setPlayers] = useState<PlayerDB[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [positionFilter, setPositionFilter] = useState('all')
    const [activeFilter, setActiveFilter] = useState('active') // 'active', 'all'

    // Modal state
    const [showModal, setShowModal] = useState(false)
    const [editingPlayer, setEditingPlayer] = useState<PlayerDB | null>(null)
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        main_position: 'OH',
        dominant_hand: 'right',
        is_active: true,
        notes: ''
    })
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (profile?.club_id && !roleLoading) {
            loadPlayers()
        }
    }, [profile?.club_id, isCoach, assignedTeamIds, roleLoading])

    const loadPlayers = async () => {
        if (!profile?.club_id) return
        setLoading(true)
        try {
            if (isCoach) {
                // Coaches only see players from their assigned teams
                if (assignedTeamIds.length === 0) {
                    setPlayers([])
                } else {
                    // Get current season
                    const season = await seasonService.getCurrentSeasonByClub(profile.club_id)
                    if (season) {
                        const data = await playerTeamSeasonService.getPlayersByTeams(assignedTeamIds, season.id)
                        setPlayers(data)
                    } else {
                        setPlayers([])
                    }
                }
            } else {
                // DT and Admin see all players
                const data = await playerService.getPlayersByClub(profile.club_id)
                setPlayers(data)
            }
        } catch (error) {
            toast.error('Error al cargar jugadoras')
        } finally {
            setLoading(false)
        }
    }

    const handleOpenModal = (player?: PlayerDB) => {
        if (player) {
            setEditingPlayer(player)
            setFormData({
                first_name: player.first_name,
                last_name: player.last_name,
                main_position: player.main_position,
                dominant_hand: player.dominant_hand || 'right',
                is_active: player.is_active,
                notes: player.notes || ''
            })
        } else {
            setEditingPlayer(null)
            setFormData({
                first_name: '',
                last_name: '',
                main_position: 'OH',
                dominant_hand: 'right',
                is_active: true,
                notes: ''
            })
        }
        setShowModal(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!profile?.club_id) return

        setSubmitting(true)
        try {
            if (editingPlayer) {
                await playerService.updatePlayer(editingPlayer.id, {
                    ...formData,
                    main_position: formData.main_position as any,
                    dominant_hand: formData.dominant_hand as any
                })
                toast.success('Jugadora actualizada')
            } else {
                await playerService.createPlayer(profile.club_id, {
                    ...formData,
                    main_position: formData.main_position as any,
                    dominant_hand: formData.dominant_hand as any,
                    secondary_position: null,
                    birth_date: null,
                    height_cm: null
                })
                toast.success('Jugadora creada')
            }
            setShowModal(false)
            loadPlayers()
        } catch (error) {
            toast.error('Error al guardar')
        } finally {
            setSubmitting(false)
        }
    }

    const filteredPlayers = players.filter(player => {
        const matchesSearch =
            player.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            player.last_name.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesPosition = positionFilter === 'all' || player.main_position === positionFilter
        const matchesActive = activeFilter === 'all' || (activeFilter === 'active' ? player.is_active : !player.is_active)

        return matchesSearch && matchesPosition && matchesActive
    })

    if (!profile) return null

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Base de Datos de Jugadoras</h1>
                    <p className="text-sm text-gray-500 mt-1">Gestión global de jugadoras del club</p>
                </div>
                {!isCoach && (
                    <button
                        onClick={() => handleOpenModal()}
                        className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nueva Jugadora</span>
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input pl-10 w-full"
                    />
                </div>
                <div className="flex gap-4">
                    <select
                        value={positionFilter}
                        onChange={(e) => setPositionFilter(e.target.value)}
                        className="input w-40"
                    >
                        <option value="all">Todas las posiciones</option>
                        <option value="S">Colocadora</option>
                        <option value="OH">Receptora</option>
                        <option value="MB">Central</option>
                        <option value="OPP">Opuesta</option>
                        <option value="L">Líbero</option>
                    </select>
                    <select
                        value={activeFilter}
                        onChange={(e) => setActiveFilter(e.target.value)}
                        className="input w-40"
                    >
                        <option value="active">Activas</option>
                        <option value="all">Todas</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {(loading || roleLoading) ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posición</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mano</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredPlayers.map((player) => (
                                    <tr key={player.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-gray-900">{player.first_name} {player.last_name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${player.main_position === 'L' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                {POSITION_NAMES[player.main_position as keyof typeof POSITION_NAMES] || player.main_position}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {player.dominant_hand === 'right' ? 'Diestra' : player.dominant_hand === 'left' ? 'Zurda' : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${player.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {player.is_active ? 'Activa' : 'Inactiva'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => navigate(`/players/${player.id}`)}
                                                    className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-full transition-colors"
                                                    title="Ver detalle"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleOpenModal(player)}
                                                    className="text-orange-600 hover:text-orange-900 p-2 hover:bg-orange-50 rounded-full transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredPlayers.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                            {isCoach
                                                ? 'No se han encontrado jugadoras para tus equipos asignados.'
                                                : 'No se encontraron jugadoras'
                                            }
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">
                                {editingPlayer ? 'Editar Jugadora' : 'Nueva Jugadora'}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.first_name}
                                        onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                        className="input w-full"
                                        placeholder="Nombre"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.last_name}
                                        onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                        className="input w-full"
                                        placeholder="Apellidos"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Posición *</label>
                                    <select
                                        value={formData.main_position}
                                        onChange={e => setFormData({ ...formData, main_position: e.target.value })}
                                        className="input w-full"
                                    >
                                        <option value="S">Colocadora</option>
                                        <option value="OH">Receptora</option>
                                        <option value="MB">Central</option>
                                        <option value="OPP">Opuesta</option>
                                        <option value="L">Líbero</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Mano Dominante</label>
                                    <select
                                        value={formData.dominant_hand}
                                        onChange={e => setFormData({ ...formData, dominant_hand: e.target.value })}
                                        className="input w-full"
                                    >
                                        <option value="right">Diestra</option>
                                        <option value="left">Zurda</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    className="input w-full h-24 resize-none"
                                    placeholder="Notas adicionales..."
                                />
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={formData.is_active}
                                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="mr-2 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                                />
                                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                                    Jugadora Activa
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="btn-secondary"
                                    disabled={submitting}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={submitting}
                                >
                                    {submitting ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
