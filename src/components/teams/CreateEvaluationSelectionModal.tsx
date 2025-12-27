import { useState, useEffect } from 'react'
import { X, User, Users, Calendar, Target } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TeamDB, teamService } from '@/services/teamService'
import { SeasonDB } from '@/services/seasonService'
import { PlayerDB } from '@/services/playerService'
import { getTeamDisplayName } from '@/utils/teamDisplay'
import { toast } from 'sonner'

interface CreateEvaluationSelectionModalProps {
    isOpen: boolean
    onClose: () => void
    teams: TeamDB[]
    seasons: SeasonDB[]
    currentSeasonId?: string
    onSelect: (data: {
        team: TeamDB
        player: PlayerDB
        season: SeasonDB
        phase: 'start' | 'mid' | 'end'
    }) => void
}

export function CreateEvaluationSelectionModal({
    isOpen,
    onClose,
    teams,
    seasons,
    currentSeasonId,
    onSelect
}: CreateEvaluationSelectionModalProps) {
    const [selectedTeamId, setSelectedTeamId] = useState<string>('')
    const [selectedPlayerId, setSelectedPlayerId] = useState<string>('')
    const [selectedSeasonId, setSelectedSeasonId] = useState<string>(currentSeasonId || '')
    const [selectedPhase, setSelectedPhase] = useState<'start' | 'mid' | 'end'>('start')

    const [players, setPlayers] = useState<PlayerDB[]>([])
    const [loadingPlayers, setLoadingPlayers] = useState(false)

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setSelectedTeamId('')
            setSelectedPlayerId('')
            setSelectedSeasonId(currentSeasonId || (seasons.length > 0 ? seasons[0].id : ''))
            setSelectedPhase('start')
            setPlayers([])
        }
    }, [isOpen, currentSeasonId, seasons])

    // Fetch players when team changes
    useEffect(() => {
        if (!selectedTeamId) {
            setPlayers([])
            return
        }

        const loadPlayers = async () => {
            setLoadingPlayers(true)
            try {
                // Fetch roster for specific season if possible, otherwise all team players
                // Usually we want the *current roster* for the selected season.
                // But teamService.getTeamPlayers usually returns currently active players.
                // Ideally we should use teamService.getTeamRoster(teamId, seasonId) if available.
                // Assuming getTeamPlayers returns all assigned players.
                const data = await teamService.getTeamPlayers(selectedTeamId)
                setPlayers(data)
            } catch (error) {
                console.error('Error fetching players:', error)
                toast.error('Error al cargar jugadoras')
            } finally {
                setLoadingPlayers(false)
            }
        }

        loadPlayers()
    }, [selectedTeamId])

    const handleSubmit = () => {
        if (!selectedTeamId || !selectedPlayerId || !selectedSeasonId || !selectedPhase) return

        const team = teams.find(t => t.id === selectedTeamId)
        const player = players.find(p => p.id === selectedPlayerId)
        const season = seasons.find(s => s.id === selectedSeasonId)

        if (team && player && season) {
            onSelect({
                team,
                player,
                season,
                phase: selectedPhase
            })
            onClose()
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Crear Nuevo Informe
                    </h2>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Season */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Temporada
                        </label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select
                                value={selectedSeasonId}
                                onChange={(e) => setSelectedSeasonId(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="" disabled>Selecciona temporada</option>
                                {seasons.map(season => (
                                    <option key={season.id} value={season.id}>
                                        {season.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Team */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Equipo
                        </label>
                        <div className="relative">
                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select
                                value={selectedTeamId}
                                onChange={(e) => setSelectedTeamId(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="" disabled>Selecciona equipo</option>
                                {teams.map(team => (
                                    <option key={team.id} value={team.id}>
                                        {getTeamDisplayName(team)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Phase */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Fase de Temporada
                        </label>
                        <div className="relative">
                            <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select
                                value={selectedPhase}
                                onChange={(e) => setSelectedPhase(e.target.value as any)}
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="start">Inicio</option>
                                <option value="mid">Mitad</option>
                                <option value="end">Final</option>
                            </select>
                        </div>
                    </div>

                    {/* Player */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Jugadora
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select
                                value={selectedPlayerId}
                                onChange={(e) => setSelectedPlayerId(e.target.value)}
                                disabled={!selectedTeamId || loadingPlayers}
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                            >
                                <option value="" disabled>
                                    {loadingPlayers ? 'Cargando...' : 'Selecciona jugadora'}
                                </option>
                                {players.map(player => (
                                    <option key={player.id} value={player.id}>
                                        {player.first_name} {player.last_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={!selectedTeamId || !selectedPlayerId || !selectedSeasonId}
                    >
                        Comenzar
                    </Button>
                </div>
            </div>
        </div>
    )
}
