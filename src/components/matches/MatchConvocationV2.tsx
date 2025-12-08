import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Play, Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { matchServiceV2, MatchV2DB } from '@/services/matchServiceV2'
import { playerTeamSeasonService } from '@/services/playerTeamSeasonService'
import { toast } from 'sonner'

function getPlayerDisplayName(player: any): string {
    if (!player) return 'Jugadora desconocida'
    return `${player.first_name} ${player.last_name}`
}

export function MatchConvocationV2() {
    const { matchId } = useParams<{ matchId: string }>()
    const navigate = useNavigate()

    const [loading, setLoading] = useState(true)
    const [match, setMatch] = useState<MatchV2DB | null>(null)
    const [availablePlayers, setAvailablePlayers] = useState<any[]>([])
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set())
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        const loadData = async () => {
            if (!matchId) return

            try {
                setLoading(true)
                // 1. Load Match
                const matchData = await matchServiceV2.getMatchV2(matchId)
                if (!matchData) {
                    toast.error('Partido no encontrado')
                    navigate('/matches')
                    return
                }
                setMatch(matchData)

                // 2. Load Roster
                const roster = await playerTeamSeasonService.getRosterByTeamAndSeason(matchData.team_id, matchData.season_id)
                setAvailablePlayers(roster)

                // 3. Load Existing Convocations
                const existingConvocations = await matchServiceV2.getConvocationsV2(matchId)
                if (existingConvocations.length > 0) {
                    setSelectedPlayerIds(new Set(existingConvocations.map(c => c.player_id)))
                } else {
                    // Default: select all active players? Or none? Let's select none by default or maybe all.
                    // V1 usually selects all by default if I recall correctly, but safer to let user choose.
                    // Let's pre-select ALL for convenience.
                    setSelectedPlayerIds(new Set(roster.map(p => p.player_id)))
                }

            } catch (error) {
                console.error('Error loading convocation data:', error)
                toast.error('Error al cargar datos')
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [matchId, navigate])

    const togglePlayer = (playerId: string) => {
        const newSelected = new Set(selectedPlayerIds)
        if (newSelected.has(playerId)) {
            newSelected.delete(playerId)
        } else {
            newSelected.add(playerId)
        }
        setSelectedPlayerIds(newSelected)
    }

    const handleSave = async (startMatch = false) => {
        if (!match) return

        try {
            setSaving(true)
            const playerIds = Array.from(selectedPlayerIds)

            // Save convocation
            await matchServiceV2.saveConvocationV2(match.id, match.team_id, match.season_id, playerIds)

            if (startMatch) {
                // Start match
                await matchServiceV2.startMatchV2(match.id)
                toast.success('Partido iniciado')
                navigate(`/live-match-v2/${match.id}`)
            } else {
                toast.success('Convocatoria guardada')
            }
        } catch (error) {
            console.error('Error saving convocation:', error)
            toast.error('Error al guardar')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">Cargando...</div>
            </div>
        )
    }

    if (!match) return null

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                icon={ArrowLeft}
                                onClick={() => navigate('/matches')}
                            >
                                Volver
                            </Button>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                    Convocatoria
                                </h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {match.opponent_name} - {new Date(match.match_date).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        <div className="text-sm font-medium text-gray-500">
                            {selectedPlayerIds.size} seleccionadas
                        </div>
                    </div>
                </div>
            </div>

            {/* Player List */}
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="grid gap-3">
                    {availablePlayers.map((item) => {
                        const isSelected = selectedPlayerIds.has(item.player_id)
                        const player = item.player
                        if (!player) return null // Should not happen

                        return (
                            <div
                                key={item.id}
                                onClick={() => togglePlayer(item.player_id)}
                                className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${isSelected
                                    ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/20 dark:border-blue-500'
                                    : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:border-blue-300'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 text-transparent'
                                        }`}>
                                        <Check size={14} />
                                    </div>
                                    <div>
                                        <h3 className={`font-medium ${isSelected ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-white'}`}>
                                            {getPlayerDisplayName(player)}
                                        </h3>
                                        {(item.jersey_number || player.position) && (
                                            <p className="text-sm text-gray-500">
                                                {item.jersey_number ? `#${item.jersey_number}` : ''}
                                                {item.jersey_number && item.role ? ' · ' : ''}
                                                {item.role || player.main_position || ''}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}

                    {availablePlayers.length === 0 && (
                        <div className="text-center py-10 text-gray-500">
                            No hay jugadoras disponibles en este equipo.
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Actions */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
                <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
                    <Button
                        variant="secondary"
                        size="lg"
                        className="flex-1"
                        icon={Save}
                        onClick={() => handleSave(false)}
                        disabled={saving}
                    >
                        Guardar
                    </Button>
                    <Button
                        variant="primary"
                        size="lg"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        icon={Play}
                        onClick={() => handleSave(true)}
                        disabled={saving || selectedPlayerIds.size < 6}
                    >
                        Iniciar Partido
                    </Button>
                </div>
            </div>
        </div>
    )
}
