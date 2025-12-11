import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Check, Play, Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { matchServiceV2, MatchV2DB } from '@/services/matchServiceV2'
import { playerTeamSeasonService } from '@/services/playerTeamSeasonService'
import { toast } from 'sonner'

function getPlayerDisplayName(player: any): string {
    if (!player) return 'Jugadora desconocida'
    return `${player.first_name} ${player.last_name}`
}

interface ConvocationModalV2Props {
    matchId: string
    onClose: () => void
    onSave?: () => void
}

export function ConvocationModalV2({ matchId, onClose, onSave }: ConvocationModalV2Props) {
    const navigate = useNavigate()

    const [loading, setLoading] = useState(true)
    const [match, setMatch] = useState<MatchV2DB | null>(null)
    const [availablePlayers, setAvailablePlayers] = useState<any[]>([])
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set())
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true)
                // 1. Load Match
                const matchData = await matchServiceV2.getMatchV2(matchId)
                if (!matchData) {
                    toast.error('Partido no encontrado')
                    onClose()
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
                    // Pre-select ALL for convenience
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
    }, [matchId, onClose])

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
                onSave?.() // Call callback
                onClose() // Close modal
            }
        } catch (error) {
            console.error('Error saving convocation:', error)
            toast.error('Error al guardar')
        } finally {
            setSaving(false)
        }
    }

    // Handle backdrop click
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
                <div className="text-sm text-zinc-400">Cargando...</div>
            </div>
        )
    }

    if (!match) return null

    return (
        <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={handleBackdropClick}
        >
            {/* Modal Container */}
            <div
                className="w-full max-w-5xl max-h-[90vh] bg-slate-950 border border-slate-800 rounded-2xl flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header - Fixed */}
                <div className="border-b border-slate-800 p-4 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            icon={X}
                            onClick={onClose}
                            className="text-zinc-400 hover:text-white"
                        >
                            Cerrar
                        </Button>
                        <div>
                            <h2 className="text-base font-bold text-white">Convocatoria</h2>
                            <p className="text-xs text-zinc-400">
                                {match.opponent_name} · {new Date(match.match_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                            </p>
                        </div>
                    </div>
                    <div className="text-xs text-zinc-400 font-medium">
                        {selectedPlayerIds.size} seleccionadas
                    </div>
                </div>

                {/* Body - Scrollable */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-2 gap-2">
                        {availablePlayers.map((item) => {
                            const isSelected = selectedPlayerIds.has(item.player_id)
                            const player = item.player
                            if (!player) return null

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => togglePlayer(item.player_id)}
                                    className={`bg-slate-900 border rounded-lg p-3 cursor-pointer transition-all ${isSelected
                                        ? 'border-blue-500'
                                        : 'border-slate-800 hover:border-slate-700'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        {/* Square Checkbox */}
                                        <div
                                            className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected
                                                ? 'bg-blue-500 border-blue-500'
                                                : 'border-zinc-600 bg-transparent'
                                                }`}
                                        >
                                            {isSelected && <Check size={10} className="text-white" />}
                                        </div>

                                        {/* Player Info */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-semibold text-white truncate">
                                                {getPlayerDisplayName(player)}
                                            </h3>
                                            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                                                <span className="font-mono">
                                                    #{item.jersey_number || player.jersey_number || '?'}
                                                </span>
                                                <span>·</span>
                                                <span className="uppercase text-[10px]">
                                                    {(() => {
                                                        const role = item.role && !['starter', 'convocado'].includes(item.role.toLowerCase()) ? item.role : null
                                                        const rawRole = role || player.main_position || item.expected_category || 'Sin posición'
                                                        return rawRole
                                                    })()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}

                        {availablePlayers.length === 0 && (
                            <div className="col-span-2 text-center py-8 text-zinc-500 text-sm">
                                No hay jugadoras disponibles en este equipo.
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer - Fixed */}
                <div className="border-t border-slate-800 p-4 flex items-center gap-2 flex-shrink-0">
                    <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        icon={Save}
                        onClick={() => handleSave(false)}
                        disabled={saving}
                    >
                        Guardar
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
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
