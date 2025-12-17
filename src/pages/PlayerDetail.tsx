import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Edit, FileText, Activity, Calendar, BarChart } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { playerService, PlayerDB } from '../services/playerService'
import { playerTeamSeasonService } from '../services/playerTeamSeasonService'
import { playerProfileService } from '../services/playerProfileService'
import { seasonService } from '../services/seasonService'
import { Button } from '@/components/ui/Button'

// Tab components
import { PlayerResumen } from '@/components/player/tabs/PlayerResumen'
import { PlayerAdministrativo } from '@/components/player/tabs/PlayerAdministrativo'
import { PlayerFisicoSalud } from '@/components/player/tabs/PlayerFisicoSalud'
import { PlayerTemporadas } from '@/components/player/tabs/PlayerTemporadas'
import { PlayerInformes } from '@/components/player/tabs/PlayerInformes'

type TabId = 'resumen' | 'admin' | 'fisico' | 'temporadas' | 'informes'

const tabs = [
    { id: 'resumen' as TabId, label: 'Resumen', icon: User },
    { id: 'admin' as TabId, label: 'Administrativo', icon: FileText },
    { id: 'fisico' as TabId, label: 'Físico & Salud', icon: Activity },
    { id: 'temporadas' as TabId, label: 'Temporadas', icon: Calendar },
    { id: 'informes' as TabId, label: 'Informes', icon: BarChart }
]

export function PlayerDetail() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { profile } = useAuthStore()
    const [player, setPlayer] = useState<PlayerDB | null>(null)
    const [loading, setLoading] = useState(true)
    const [hasInjury, setHasInjury] = useState<boolean>(false)
    const [currentSeason, setCurrentSeason] = useState<{ id: string } | null>(null)
    const [activeTab, setActiveTab] = useState<TabId>('resumen')

    useEffect(() => {
        loadPlayer()
    }, [id, profile?.club_id])

    const loadPlayer = async () => {
        if (!profile?.club_id || !id) return

        try {
            setLoading(true)
            const players = await playerService.getPlayersByClub(profile.club_id)
            const foundPlayer = players.find(p => p.id === id)

            if (foundPlayer) {
                setPlayer(foundPlayer)

                // Get current season
                const season = await seasonService.getCurrentSeasonByClub(profile.club_id)
                setCurrentSeason(season)

                // Get injury status
                if (season) {
                    try {
                        const pts = await playerTeamSeasonService.getPlayerTeamBySeason(id, season.id)
                        const activeInjury = await playerProfileService.getActiveInjury(id, season.id)
                        setHasInjury(pts?.has_injury || activeInjury !== null || false)
                    } catch (error) {
                        setHasInjury(false)
                    }
                }
            } else {
                console.error('Player not found')
            }
        } catch (error) {
            console.error('Error loading player:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleEditPlayer = () => {
        navigate('/players', { state: { editPlayerId: id } })
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 dark flex items-center justify-center">
                <div className="text-gray-400">Cargando jugadora...</div>
            </div>
        )
    }

    if (!player) {
        return (
            <div className="min-h-screen bg-gray-900 dark flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-2">Jugadora no encontrada</h1>
                    <p className="text-gray-400 mb-4">La jugadora que buscas no existe.</p>
                    <Button variant="primary" size="md" onClick={() => navigate('/players')}>
                        Volver a jugadoras
                    </Button>
                </div>
            </div>
        )
    }

    const getPositionName = (position: string) => {
        const positions: Record<string, string> = {
            'OH': 'Receptora',
            'MB': 'Central',
            'S': 'Colocadora',
            'L': 'Líbero',
            'OPP': 'Opuesta'
        }
        return positions[position] || position
    }

    return (
        <div className="min-h-screen bg-gray-900 dark">
            {/* Header */}
            <div className="bg-gray-800 dark border-b border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between mb-4">
                        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/players')}>
                            Volver a jugadoras
                        </Button>
                        <Button variant="secondary" size="md" icon={Edit} onClick={handleEditPlayer}>
                            Editar jugadora
                        </Button>
                    </div>

                    <div className="flex items-start gap-6">
                        {/* Player Avatar */}
                        <div className="w-24 h-24 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                            <User className="w-12 h-12 text-primary-400" />
                        </div>

                        {/* Player Info */}
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-white mb-2">
                                {player.first_name} {player.last_name}
                            </h1>

                            <div className="flex flex-wrap items-center gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-400">Posición:</span>
                                    <span className="px-3 py-1 bg-primary-500/20 text-primary-300 rounded-full font-medium border border-primary-500/30">
                                        {getPositionName(player.main_position)}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-400">Estado:</span>
                                    {hasInjury ? (
                                        <span className="px-3 py-1 bg-orange-500/20 text-orange-300 rounded-full font-medium border border-orange-500/30 flex items-center gap-1.5">
                                            🟠 Lesionada
                                        </span>
                                    ) : player.is_active ? (
                                        <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full font-medium border border-green-500/30 flex items-center gap-1.5">
                                            🟢 Activa
                                        </span>
                                    ) : (
                                        <span className="px-3 py-1 bg-gray-700/30 text-gray-400 rounded-full font-medium border border-gray-600/30 flex items-center gap-1.5">
                                            🔴 Inactiva
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs Navigation */}
                    <div className="mt-6 border-b border-gray-700">
                        <nav className="flex -mb-px space-x-8 overflow-x-auto">
                            {tabs.map((tab) => {
                                const Icon = tab.icon
                                const isActive = activeTab === tab.id
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${isActive
                                            ? 'border-primary-500 text-primary-400'
                                            : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {tab.label}
                                    </button>
                                )
                            })}
                        </nav>
                    </div>
                </div>
            </div>

            {/* Tab Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {activeTab === 'resumen' && <PlayerResumen player={player} />}
                {activeTab === 'admin' && <PlayerAdministrativo playerId={player.id} />}
                {activeTab === 'fisico' && (
                    <PlayerFisicoSalud
                        playerId={player.id}
                        currentSeason={currentSeason}
                        hasInjury={hasInjury}
                        onInjuryChange={(status) => setHasInjury(status)}
                    />
                )}
                {activeTab === 'temporadas' && <PlayerTemporadas playerId={player.id} />}
                {activeTab === 'informes' && <PlayerInformes playerId={player.id} />}
            </div>
        </div>
    )
}
