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
    const [activeFilter, setActiveFilter] = useState('active')

    // Modal state
    const [showModal, setShowModal] = useState(false)
    const [editingPlayer, setEditingPlayer] = useState<PlayerDB | null>(null)
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        birth_date: '',
        gender: 'female',
        height_cm: '',
        weight_kg: '',
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
                if (assignedTeamIds.length === 0) {
                    setPlayers([])
                } else {
                    const season = await seasonService.getCurrentSeasonByClub(profile.club_id)
                    if (season) {
                        const data = await playerTeamSeasonService.getPlayersByTeams(assignedTeamIds, season.id)
                        setPlayers(data)
                    } else {
                        setPlayers([])
                    }
                }
            } else {
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
                birth_date: player.birth_date ? new Date(player.birth_date).toISOString().split('T')[0] : '',
                gender: player.gender || 'female',
                height_cm: player.height_cm ? player.height_cm.toString() : '',
                weight_kg: player.weight_kg ? player.weight_kg.toString() : '',
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
                birth_date: '',
                gender: 'female',
                height_cm: '',
                weight_kg: '',
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
            const playerData = {
                ...formData,
                gender: formData.gender as any,
                main_position: formData.main_position as any,
                dominant_hand: formData.dominant_hand as any,
                height_cm: formData.height_cm ? parseInt(formData.height_cm) : null,
                weight_kg: formData.weight_kg ? parseInt(formData.weight_kg) : null,
                birth_date: formData.birth_date
            }

            if (editingPlayer) {
                await playerService.updatePlayer(editingPlayer.id, playerData)
                toast.success('Jugadora actualizada')
            } else {
                await playerService.createPlayer({
                    club_id: profile.club_id,
                    ...playerData,
                    secondary_position: null
                })
                toast.success('Jugadora creada')
            }
            setShowModal(false)
            loadPlayers()
        } catch (error) {
            console.error(error)
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

    if (loading || roleLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Cargando jugadoras...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Base de Datos de Jugadoras</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestión global de jugadoras del club</p>
                        </div>
                        {!isCoach && (
                            <button
                                onClick={() => handleOpenModal()}
                                className="btn-primary flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Nueva Jugadora</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* Search Bar */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Buscar jugadora..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>
                            <div className="flex gap-4">
                                <select
                                    value={positionFilter}
                                    onChange={(e) => setPositionFilter(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
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
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                                >
                                    <option value="active">Activas</option>
                                    <option value="all">Todas</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    {filteredPlayers.length === 0 ? (
                        <div className="text-center py-12">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                No se encontraron jugadoras
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400">
                                {searchTerm ? 'Intenta con otra búsqueda' : isCoach ? 'No hay jugadoras en tus equipos asignados' : 'No hay jugadoras registradas'}
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
                                            Posición
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Estado
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Datos
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Acción
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredPlayers.map((player) => (
                                        <tr
                                            key={player.id}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {player.first_name} {player.last_name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${player.main_position === 'L'
                                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                    }`}>
                                                    {POSITION_NAMES[player.main_position as keyof typeof POSITION_NAMES] || player.main_position}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${player.is_active
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                    }`}>
                                                    {player.is_active ? 'Activa' : 'Inactiva'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {player.birth_date ? new Date(player.birth_date).getFullYear() : '-'} • {player.height_cm ? `${player.height_cm}cm` : '-'} • {player.dominant_hand === 'right' ? 'Diestra' : 'Zurda'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => navigate(`/players/${player.id}`)}
                                                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                        title="Ver detalle"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenModal(player)}
                                                        className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300 p-2 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                {editingPlayer ? 'Editar Jugadora' : 'Nueva Jugadora'}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.first_name}
                                        onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                        className="input w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                                        placeholder="Nombre"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Apellidos *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.last_name}
                                        onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                        className="input w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                                        placeholder="Apellidos"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Nacimiento *</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.birth_date}
                                        onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                                        className="input w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Género *</label>
                                    <select
                                        value={formData.gender}
                                        onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                        className="input w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                                    >
                                        <option value="female">Femenino</option>
                                        <option value="male">Masculino</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Altura (cm)</label>
                                    <input
                                        type="number"
                                        value={formData.height_cm}
                                        onChange={e => setFormData({ ...formData, height_cm: e.target.value })}
                                        className="input w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                                        placeholder="175"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Peso (kg)</label>
                                    <input
                                        type="number"
                                        value={formData.weight_kg}
                                        onChange={e => setFormData({ ...formData, weight_kg: e.target.value })}
                                        className="input w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                                        placeholder="65"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Posición *</label>
                                    <select
                                        value={formData.main_position}
                                        onChange={e => setFormData({ ...formData, main_position: e.target.value })}
                                        className="input w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                                    >
                                        <option value="S">Colocadora</option>
                                        <option value="OH">Receptora</option>
                                        <option value="MB">Central</option>
                                        <option value="OPP">Opuesta</option>
                                        <option value="L">Líbero</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mano Dominante</label>
                                    <select
                                        value={formData.dominant_hand}
                                        onChange={e => setFormData({ ...formData, dominant_hand: e.target.value })}
                                        className="input w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                                    >
                                        <option value="right">Diestra</option>
                                        <option value="left">Zurda</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    className="input w-full h-24 resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                                    placeholder="Notas adicionales..."
                                />
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={formData.is_active}
                                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="mr-2 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 dark:border-gray-600 rounded"
                                />
                                <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Jugadora Activa
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700 mt-6">
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

