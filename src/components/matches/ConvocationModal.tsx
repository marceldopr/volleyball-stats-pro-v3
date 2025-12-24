import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Check, Play, Save, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { matchService, MatchV2DB } from '@/services/matchService'
import { playerTeamSeasonService } from '@/services/playerTeamSeasonService'
import { toast } from 'sonner'
import { getEffectivePlayerDisplayData } from '@/utils/playerEffectiveDisplay'

function getPlayerDisplayName(player: any): string {
    if (!player) return 'Jugadora desconocida'
    return `${player.first_name} ${player.last_name}`
}

export function ConvocationModal({ matchId, onClose, onSave }: { matchId: string, onClose: () => void, onSave?: () => void }) {
    const navigate = useNavigate()

    const [loading, setLoading] = useState(true)
    const [match, setMatch] = useState<MatchV2DB | null>(null)
    const [availablePlayers, setAvailablePlayers] = useState<any[]>([])
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set())

    // Store overrides locally: { [playerId]: { jersey?: string, position?: string } }
    const [overrides, setOverrides] = useState<Record<string, { jersey?: string, position?: string }>>({})

    const [saving, setSaving] = useState(false)

    // Editing states
    const [editingJersey, setEditingJersey] = useState<string | null>(null) // playerId
    const [editingPosition, setEditingPosition] = useState<string | null>(null) // playerId

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true)
                const matchData = await matchService.getMatch(matchId)
                if (!matchData) {
                    toast.error('Partido no encontrado')
                    onClose()
                    return
                }
                setMatch(matchData)

                const roster = await playerTeamSeasonService.getActiveRosterByTeamAndSeason(matchData.team_id, matchData.season_id)
                setAvailablePlayers(roster)

                const existingConvocations = await matchService.getConvocations(matchId)

                // Initialize selection and overrides from DB
                const initialSelected = new Set<string>()
                const initialOverrides: Record<string, { jersey?: string, position?: string }> = {}

                if (existingConvocations.length > 0) {
                    existingConvocations.forEach(c => {
                        initialSelected.add(c.player_id)
                        if (c.jersey_number_override || c.position_override) {
                            initialOverrides[c.player_id] = {
                                jersey: c.jersey_number_override,
                                position: c.position_override
                            }
                        }
                    })
                    setSelectedPlayerIds(initialSelected)
                } else {
                    // Pre-select ALL if new
                    setSelectedPlayerIds(new Set(roster.map(p => p.player_id)))
                }
                setOverrides(initialOverrides)

            } catch (error) {
                console.error('Error loading convocation data:', error)
                toast.error('Error al cargar datos')
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [matchId, onClose])

    // Derived State: Process players with effective values and errors
    const processedPlayers = useMemo(() => {
        const jerseyCounts: Record<string, number> = {}

        // 1. Calculate effective values for SELECTED players only (for duplication check)
        availablePlayers.forEach(p => {
            if (!selectedPlayerIds.has(p.player_id)) return

            // Construct pseudo-convocation object from local overrides
            const ovr = overrides[p.player_id]
            const convocationData = {
                player_id: p.player_id,
                jersey_number_override: ovr?.jersey,
                position_override: ovr?.position,
                role_in_match: null // In modal context, we rely on overrides or roster
            }

            const effectiveData = getEffectivePlayerDisplayData(
                p.player || { id: p.player_id },
                p, // p is the roster item in ConvocationModal
                convocationData
            )

            if (effectiveData.jerseyNumber && effectiveData.jerseyNumber !== '?') {
                jerseyCounts[effectiveData.jerseyNumber] = (jerseyCounts[effectiveData.jerseyNumber] || 0) + 1
            }
        })

        // 2. Map players
        return availablePlayers.map(p => {
            const isSelected = selectedPlayerIds.has(p.player_id)
            const ovr = overrides[p.player_id]

            // Construct pseudo-convocation object
            const convocationData = {
                player_id: p.player_id,
                jersey_number_override: ovr?.jersey, // Local override
                position_override: ovr?.position,   // Local override
                role_in_match: null
            }

            // Use Unified Utility
            const effectiveData = getEffectivePlayerDisplayData(
                p.player || { id: p.player_id },
                p, // roster item
                convocationData
            )

            const effectiveJersey = effectiveData.jerseyNumber === '?' ? '' : effectiveData.jerseyNumber
            const effectivePosition = effectiveData.position === '?' ? '' : effectiveData.position

            // Error detection (Only if selected)
            let errorType: 'critical' | 'warning' | null = null
            let errorMsg = ''

            if (isSelected) {
                if (!effectiveJersey) {
                    errorType = 'critical'
                    errorMsg = 'Falta dorsal'
                } else if (jerseyCounts[effectiveJersey] > 1) {
                    errorType = 'critical'
                    errorMsg = 'Dorsal duplicado'
                } else if (!effectivePosition) {
                    errorType = 'warning'
                    errorMsg = 'Falta posición'
                }
            }

            return {
                ...p,
                isSelected,
                effectiveJersey,
                effectivePosition,
                errorType,
                errorMsg,
                hasOverride: !!ovr || effectiveData.source === 'override',
                isLoaned: effectiveData.isLoaned
            }
        }).sort((a, b) => {
            // Sort: Errors First > Selected > Number
            if (a.errorType === 'critical' && b.errorType !== 'critical') return -1
            if (b.errorType === 'critical' && a.errorType !== 'critical') return 1
            if (a.errorType === 'warning' && b.errorType !== 'warning') return -1
            if (b.errorType === 'warning' && a.errorType !== 'warning') return 1

            if (a.isSelected !== b.isSelected) return a.isSelected ? -1 : 1

            return (parseInt(a.effectiveJersey) || 999) - (parseInt(b.effectiveJersey) || 999)
        })
    }, [availablePlayers, selectedPlayerIds, overrides])

    const totalErrors = processedPlayers.filter(p => p.isSelected && p.errorType === 'critical').length
    const totalWarnings = processedPlayers.filter(p => p.isSelected && p.errorType === 'warning').length

    const togglePlayer = (playerId: string) => {
        const newSelected = new Set(selectedPlayerIds)
        if (newSelected.has(playerId)) {
            newSelected.delete(playerId)
        } else {
            newSelected.add(playerId)
        }
        setSelectedPlayerIds(newSelected)
    }

    const updateOverride = (playerId: string, type: 'jersey' | 'position', value: string | null) => {
        setOverrides(prev => ({
            ...prev,
            [playerId]: {
                ...prev[playerId],
                [type]: value === '' ? null : value
            }
        }))
    }

    const handleSave = async (startMatch = false) => {
        if (!match) return
        if (totalErrors > 0) {
            toast.error('Corrige los errores antes de guardar (Dorsales faltantes o duplicados)')
            return
        }

        try {
            setSaving(true)
            const playerIds = Array.from(selectedPlayerIds)

            // 1. Save Membership (RPC adds/removes)
            await matchService.saveConvocation(match.id, match.team_id, match.season_id, playerIds)

            // 2. Save Overrides sequentially (only for selected players with overrides)
            // This ensures any new players inserted by RPC get updated
            const overridePromises = playerIds.map(pid => {
                const ovr = overrides[pid]
                if (ovr) {
                    return matchService.updateConvocationOverride(match.id, pid, {
                        jersey_number_override: ovr.jersey,
                        position_override: ovr.position
                    })
                }
                return Promise.resolve()
            })

            await Promise.all(overridePromises)

            if (startMatch) {
                await matchService.startMatch(match.id)
                toast.success('Partido iniciado')
                navigate(`/live-match/${match.id}`)
            } else {
                toast.success('Convocatoria guardada')
                onSave?.()
                onClose()
            }
        } catch (error) {
            console.error('Error saving convocation:', error)
            toast.error('Error al guardar')
        } finally {
            setSaving(false)
        }
    }

    // --- Render Helpers ---

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
                <div className="text-sm text-zinc-400">Cargando...</div>
            </div>
        )
    }

    if (!match) return null

    return (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
            <div className="w-full max-w-4xl max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="border-b border-zinc-800 p-4 flex items-center justify-between text-white bg-zinc-900/50">
                    <div>
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            Convocatoria
                            {(totalErrors > 0) && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/30 flex items-center gap-1"><AlertTriangle size={12} /> {totalErrors} Errores</span>}
                            {(totalWarnings > 0) && <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1"><AlertTriangle size={12} /> {totalWarnings} Avisos</span>}
                        </h2>
                        <p className="text-xs text-zinc-400">{match.opponent_name} · {selectedPlayerIds.size} seleccionadas</p>
                    </div>
                    <Button variant="ghost" size="sm" icon={X} onClick={onClose}>Cerrar</Button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {processedPlayers.map((p) => (
                        <div
                            key={p.id}
                            className={`
                                group flex items-center gap-3 p-2 rounded-lg border transition-all text-sm
                                ${p.errorType === 'critical' ? 'bg-red-500/10 border-red-500/30 hover:border-red-500/50' :
                                    p.errorType === 'warning' ? 'bg-amber-500/05 border-amber-500/30 hover:border-amber-500/50' :
                                        p.isSelected ? 'bg-zinc-900 border-zinc-700 hover:border-zinc-600' : 'opacity-60 border-transparent hover:bg-zinc-900/50'}
                            `}
                        >
                            {/* Checkbox */}
                            <div
                                onClick={() => togglePlayer(p.player_id)}
                                className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${p.isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-zinc-600'}`}
                            >
                                {p.isSelected && <Check size={14} strokeWidth={3} />}
                            </div>

                            {/* Name & Info */}
                            <div className="flex-1 cursor-default">
                                <div className="font-semibold text-zinc-200">
                                    {getPlayerDisplayName(p.player)}
                                </div>
                                <div className="text-xs text-zinc-500 flex items-center gap-2">
                                    {(p as any).assignment_type === 'secondary' && <span className="text-amber-500">Cedida ({p.current_category})</span>}
                                    {p.errorMsg && <span className={p.errorType === 'critical' ? 'text-red-400 font-bold' : 'text-amber-400'}>{p.errorMsg}</span>}
                                </div>
                            </div>

                            {/* Actions Group */}
                            {p.isSelected && (
                                <div className="flex items-center gap-2">

                                    {/* Jersey Edit */}
                                    {editingJersey === p.player_id ? (
                                        <div className="relative">
                                            <input
                                                autoFocus
                                                type="text"
                                                className="w-12 bg-black border border-blue-500 rounded px-1 py-0.5 text-center text-white font-mono"
                                                defaultValue={p.effectiveJersey || ''}
                                                onBlur={(e) => {
                                                    updateOverride(p.player_id, 'jersey', e.target.value)
                                                    setEditingJersey(null)
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        updateOverride(p.player_id, 'jersey', e.currentTarget.value)
                                                        setEditingJersey(null)
                                                    }
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setEditingJersey(p.player_id)}
                                            className={`
                                                min-w-[32px] px-1.5 py-1 rounded text-center font-mono font-bold transition-colors border
                                                ${!p.effectiveJersey ? 'bg-red-500/20 text-red-500 border-red-500/40 animate-pulse' :
                                                    p.errorMsg === 'Dorsal duplicado' ? 'bg-red-500/20 text-red-500 border-red-500/40' :
                                                        overrides[p.player_id]?.jersey ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                                                            'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'}
                                            `}
                                            title="Click para editar dorsal"
                                        >
                                            {p.effectiveJersey || '#?'}
                                        </button>
                                    )}

                                    {/* Position Edit */}
                                    {editingPosition === p.player_id ? (
                                        <select
                                            autoFocus
                                            className="w-16 bg-black border border-blue-500 rounded px-1 py-0.5 text-center text-white text-xs"
                                            value={p.effectivePosition || ''}
                                            onChange={(e) => {
                                                updateOverride(p.player_id, 'position', e.target.value)
                                                setEditingPosition(null)
                                            }}
                                            onBlur={() => setEditingPosition(null)}
                                        >
                                            <option value="">SIN</option>
                                            <option value="S">S</option>
                                            <option value="OH">OH</option>
                                            <option value="MB">MB</option>
                                            <option value="OPP">OPP</option>
                                            <option value="L">L</option>
                                        </select>
                                    ) : (
                                        <button
                                            onClick={() => setEditingPosition(p.player_id)}
                                            className={`
                                                w-14 px-1.5 py-1 rounded text-center text-xs font-bold uppercase transition-colors border
                                                ${!p.effectivePosition ? 'bg-amber-500/20 text-amber-500 border-amber-500/40' :
                                                    overrides[p.player_id]?.position ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                                                        'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'}
                                            `}
                                            title="Click para editar posición"
                                        >
                                            {p.effectivePosition || 'SIN'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="border-t border-zinc-800 p-4 flex gap-3 text-sm">
                    <Button
                        variant="secondary"
                        onClick={() => handleSave(false)}
                        disabled={saving || totalErrors > 0}
                        className="flex-1"
                        icon={Save}
                    >
                        {saving ? 'Guardando...' : 'Guardar Convocatoria'}
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => handleSave(true)}
                        disabled={saving || totalErrors > 0 || selectedPlayerIds.size < 6}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        icon={Play}
                    >
                        Iniciar Partido
                    </Button>
                </div>
            </div>
        </div>
    )
}
