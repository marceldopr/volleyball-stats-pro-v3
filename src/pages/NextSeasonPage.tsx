import { useState, useEffect } from 'react'
import { Calendar, Users, UserCog, Clock, ChevronRight, AlertCircle, Play, X, Check } from 'lucide-react'
import { useSeasonStore } from '@/stores/seasonStore'
import { useAuthStore } from '@/stores/authStore'
import { teamService, TeamDB } from '@/services/teamService'
import { playerService, PlayerDB } from '@/services/playerService'
import { seasonService } from '@/services/seasonService'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import { getTeamDisplayName } from '@/utils/teamDisplay'
import { useTrainingStore } from '@/stores/trainingStore'
import { useNavigate } from 'react-router-dom'
import { RosterPlanningTab } from '@/components/season/RosterPlanningTab'

type TabId = 'estructura' | 'plantillas' | 'entrenadores' | 'horarios'

interface Tab {
    id: TabId
    name: string
    icon: React.ReactNode
}

export function NextSeasonPage() {
    const navigate = useNavigate()
    const { profile } = useAuthStore()
    const { seasons, activeSeasonId, loadSeasons } = useSeasonStore()
    const { getSchedulesBySeason, cloneSchedulesToSeason } = useTrainingStore()

    const [activeTab, setActiveTab] = useState<TabId>('estructura')
    const [teams, setTeams] = useState<TeamDB[]>([])
    const [players, setPlayers] = useState<PlayerDB[]>([])
    const [loading, setLoading] = useState(true)
    const [showActivateModal, setShowActivateModal] = useState(false)
    const [activating, setActivating] = useState(false)

    // Get draft season (next season)
    const draftSeason = seasons.find(s => s.status === 'draft')
    const activeSeason = seasons.find(s => s.id === activeSeasonId)

    // Load data
    useEffect(() => {
        async function loadData() {
            if (!profile?.club_id) return
            setLoading(true)
            try {
                await loadSeasons(profile.club_id)
                const [teamsData, playersData] = await Promise.all([
                    teamService.getTeamsByClub(profile.club_id),
                    playerService.getPlayersByClub(profile.club_id)
                ])
                setTeams(teamsData)
                // Filter out inactive players (those who left the club)
                setPlayers(playersData.filter(p => p.is_active))
            } catch (error) {
                console.error('Error loading data:', error)
                toast.error('Error al cargar datos')
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [profile?.club_id, loadSeasons])

    const tabs: Tab[] = [
        { id: 'estructura', name: 'Estructura de equipos', icon: <Users className="w-5 h-5" /> },
        { id: 'plantillas', name: 'Plantillas', icon: <Users className="w-5 h-5" /> },
        { id: 'entrenadores', name: 'Entrenadores', icon: <UserCog className="w-5 h-5" /> },
        { id: 'horarios', name: 'Horarios', icon: <Clock className="w-5 h-5" /> }
    ]

    // Get schedules for draft season
    const draftSchedules = draftSeason ? getSchedulesBySeason(draftSeason.id) : []
    const activeSchedules = activeSeason ? getSchedulesBySeason(activeSeason.id) : []

    const renderContent = () => {
        if (!draftSeason) {
            return (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No hay temporada en borrador</h3>
                    <p className="text-gray-400 mb-6">
                        Crea una nueva temporada en Configuración → Temporada antes de planificar la próxima temporada.
                    </p>
                    <Button
                        variant="primary"
                        onClick={() => navigate('/settings')}
                    >
                        Ir a Configuración
                    </Button>
                </div>
            )
        }

        switch (activeTab) {
            case 'estructura':
                return (
                    <div className="space-y-6">
                        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Equipos para {draftSeason.name}</h3>
                            <p className="text-gray-400 mb-6">
                                Los equipos se gestionan en la sección Equipos. Aquí puedes ver la estructura actual que se mantendrá para la próxima temporada.
                            </p>

                            {teams.length === 0 ? (
                                <p className="text-gray-500">No hay equipos configurados.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {teams.map(team => (
                                        <div key={team.id} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                                            <h4 className="font-medium text-white">{getTeamDisplayName(team)}</h4>
                                            <p className="text-sm text-gray-400">{team.category} - {team.gender === 'male' ? 'Masculino' : 'Femenino'}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )

            case 'plantillas':
                return (
                    <RosterPlanningTab
                        teams={teams}
                        players={players}
                        previousSeasonId={activeSeason?.id || null}
                        nextSeasonId={draftSeason.id}
                        seasonStartDate={draftSeason.start_date || ''}
                        seasonName={draftSeason.name}
                        clubId={profile?.club_id || ''}
                    />
                )

            case 'entrenadores':
                return (
                    <div className="space-y-6">
                        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Asignación de entrenadores</h3>
                            <p className="text-gray-400 mb-6">
                                Planifica qué entrenadores dirigirán cada equipo en la próxima temporada.
                            </p>

                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                                <p className="text-sm text-blue-400">
                                    <strong>Próximamente:</strong> Sistema de asignación de entrenadores con roles
                                    (principal, asistente, etc.) y validación de conflictos de horario.
                                </p>
                            </div>

                            <Button
                                variant="secondary"
                                className="mt-4"
                                onClick={() => navigate('/coach-assignments')}
                            >
                                Ver asignaciones actuales
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )

            case 'horarios':
                return (
                    <div className="space-y-6">
                        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Horarios de entrenamiento</h3>
                                    <p className="text-gray-400 text-sm">
                                        Horarios planificados para {draftSeason.name}
                                    </p>
                                </div>

                                {activeSchedules.length > 0 && draftSchedules.length === 0 && (
                                    <Button
                                        variant="primary"
                                        onClick={() => {
                                            if (activeSeasonId && draftSeason) {
                                                cloneSchedulesToSeason(activeSeasonId, draftSeason.id)
                                                toast.success(`Horarios clonados desde ${activeSeason?.name}`)
                                            }
                                        }}
                                    >
                                        Clonar desde temporada activa
                                    </Button>
                                )}
                            </div>

                            {draftSchedules.length === 0 ? (
                                <div className="text-center py-8">
                                    <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                    <p className="text-gray-400 mb-4">No hay horarios configurados para esta temporada.</p>
                                    {activeSchedules.length > 0 && (
                                        <p className="text-sm text-gray-500">
                                            Puedes clonar los horarios de la temporada activa usando el botón de arriba.
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {draftSchedules.map(schedule => (
                                        <div key={schedule.id} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-medium text-white">{schedule.teamName}</h4>
                                                    <p className="text-sm text-gray-400">
                                                        {schedule.startTime} - {schedule.endTime} • {schedule.preferredSpace}
                                                    </p>
                                                </div>
                                                <span className={`px-2 py-1 rounded text-xs ${schedule.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                                                    {schedule.isActive ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <Button
                                variant="secondary"
                                className="mt-4"
                                onClick={() => navigate('/settings')}
                            >
                                Gestionar horarios en Configuración
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-950 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Calendar className="w-8 h-8 text-primary-500" />
                            <h1 className="text-3xl font-bold text-white">Próxima Temporada</h1>
                        </div>
                        <p className="text-gray-400">
                            {draftSeason
                                ? <span>Planificando: <strong className="text-white">{draftSeason.name}</strong></span>
                                : 'Crea una temporada en borrador para comenzar a planificar'}
                        </p>
                    </div>

                    {draftSeason && draftSeason.start_date && draftSeason.end_date && (
                        <Button
                            variant="primary"
                            icon={Play}
                            onClick={() => setShowActivateModal(true)}
                        >
                            Activar Temporada
                        </Button>
                    )}
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                                }`}
                        >
                            {tab.icon}
                            {tab.name}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {renderContent()}
            </div>

            {/* Activation Confirmation Modal */}
            {showActivateModal && draftSeason && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-md w-full p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold text-white">Activar Temporada</h3>
                            <button
                                onClick={() => setShowActivateModal(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                                <p className="text-yellow-400 font-medium mb-2">¿Estás seguro?</p>
                                <p className="text-sm text-gray-300">
                                    Al activar <strong className="text-white">{draftSeason.name}</strong>:
                                </p>
                                <ul className="text-sm text-gray-300 mt-2 space-y-1">
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-green-400" />
                                        La temporada {draftSeason.name} se convertirá en la temporada activa
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-orange-400" />
                                        La temporada actual ({activeSeason?.name}) será archivada
                                    </li>
                                </ul>
                            </div>

                            <div className="bg-gray-900 rounded-lg p-4">
                                <p className="text-sm text-gray-400 mb-2">Detalles de la temporada:</p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <span className="text-gray-500">Nombre:</span>
                                    <span className="text-white">{draftSeason.name}</span>
                                    <span className="text-gray-500">Inicio:</span>
                                    <span className="text-white">{draftSeason.start_date}</span>
                                    <span className="text-gray-500">Fin:</span>
                                    <span className="text-white">{draftSeason.end_date}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="secondary"
                                className="flex-1"
                                onClick={() => setShowActivateModal(false)}
                                disabled={activating}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="primary"
                                className="flex-1"
                                icon={Play}
                                disabled={activating}
                                onClick={async () => {
                                    if (!profile?.club_id) return
                                    setActivating(true)
                                    try {
                                        await seasonService.setActiveSeason(profile.club_id, draftSeason.id)
                                        await loadSeasons(profile.club_id)
                                        toast.success(`Temporada "${draftSeason.name}" activada correctamente`)
                                        setShowActivateModal(false)
                                        navigate('/')
                                    } catch (error: any) {
                                        toast.error(error.message || 'Error al activar temporada')
                                    } finally {
                                        setActivating(false)
                                    }
                                }}
                            >
                                {activating ? 'Activando...' : 'Confirmar Activación'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
