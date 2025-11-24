import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { playerService, PlayerDB } from '../services/playerService'
import { PlayerReports } from '../components/players/PlayerReports'

export function PlayerDetail() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { profile } = useAuthStore()
    const [player, setPlayer] = useState<PlayerDB | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadPlayer()
    }, [id, profile?.club_id])

    const loadPlayer = async () => {
        if (!profile?.club_id || !id) return

        try {
            setLoading(true)
            // Get all players from club and find the specific one
            const players = await playerService.getPlayersByClub(profile.club_id)
            const foundPlayer = players.find(p => p.id === id)

            if (foundPlayer) {
                setPlayer(foundPlayer)
            } else {
                console.error('Player not found')
            }
        } catch (error) {
            console.error('Error loading player:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-gray-500">Cargando jugadora...</div>
            </div>
        )
    }

    if (!player) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Jugadora no encontrada</h1>
                    <p className="text-gray-600 mb-4">La jugadora que buscas no existe.</p>
                    <button
                        onClick={() => navigate('/players')}
                        className="btn-primary"
                    >
                        Volver a jugadoras
                    </button>
                </div>
            </div>
        )
    }

    const getPositionName = (position: string) => {
        const positions: Record<string, string> = {
            'OH': 'Opuesta',
            'MB': 'Central',
            'S': 'Colocadora',
            'L': 'Líbero',
            'OPP': 'Opuesta'
        }
        return positions[position] || position
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <button
                        onClick={() => navigate('/players')}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver a jugadoras
                    </button>

                    <div className="flex items-start gap-6">
                        {/* Player Avatar */}
                        <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                            <User className="w-12 h-12 text-primary-600" />
                        </div>

                        {/* Player Info */}
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                {player.first_name} {player.last_name}
                            </h1>

                            <div className="flex flex-wrap items-center gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-700">Posición:</span>
                                    <span className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full font-medium">
                                        {getPositionName(player.main_position)}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-700">Estado:</span>
                                    <span className={`px-3 py-1 rounded-full font-medium ${player.is_active
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {player.is_active ? 'Activa' : 'Inactiva'}
                                    </span>
                                </div>
                            </div>

                            {player.birth_date && (
                                <div className="mt-3 text-sm text-gray-600">
                                    <span className="font-medium">Fecha de nacimiento:</span>{' '}
                                    {new Date(player.birth_date).toLocaleDateString('es-ES', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <PlayerReports playerId={player.id} />
            </div>
        </div>
    )
}
