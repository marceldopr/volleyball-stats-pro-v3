import { useState, useMemo } from 'react'
import { Check, X, RefreshCw, Lock, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PlayerV2 } from '@/stores/matchStoreV2'
import { isLibero, isValidSubstitution } from '@/lib/volleyball/substitutionHelpers'
import { toast } from 'sonner'
import { RotationGridStandard } from '../match/RotationGridStandard'
import { PlayerCard } from '../match/PlayerCard'
import {
    PlannedSub,
    simulatePlannedSubstitutions,
    canAddToBatch,
    isPlayerInBatch
} from '@/lib/volleyball/substitutionBatch'

interface SubstitutionModalV2Props {
    isOpen: boolean
    onClose: () => void
    onConfirm: (params: {
        playerOutId: string
        playerInId: string
        position: 1 | 2 | 3 | 4 | 5 | 6
    }) => void
    onCourtPlayers: { position: 1 | 2 | 3 | 4 | 5 | 6; player: PlayerV2 }[]
    benchPlayers: PlayerV2[]
    currentSetNumber: number
    allPlayers: PlayerV2[]
    currentSetSubstitutions: {
        setNumber: number
        totalSubstitutions: number
        pairs: Array<{
            starterId: string
            substituteId: string
            usesCount: number
        }>
    }
}

export function SubstitutionModalV2({
    isOpen,
    onClose,
    onConfirm,
    onCourtPlayers,
    benchPlayers,
    currentSetNumber,
    allPlayers,
    currentSetSubstitutions
}: SubstitutionModalV2Props) {
    const [playerOut, setPlayerOut] = useState<{ id: string; position: 1 | 2 | 3 | 4 | 5 | 6 } | null>(null)
    const [playerInId, setPlayerInId] = useState<string | null>(null)

    // Planned substitutions (always available, no toggle needed)
    const [planned, setPlanned] = useState<PlannedSub[]>([])

    // Simulated state: applies planned subs to preview
    // Always simulate when there are planned subs
    const simulatedState = useMemo(() => {
        if (planned.length === 0) {
            return {
                onCourtPlayers,
                currentSetSubstitutions,
                totalWithPlanned: currentSetSubstitutions.totalSubstitutions
            }
        }
        return simulatePlannedSubstitutions(onCourtPlayers, currentSetSubstitutions, planned)
    }, [planned, onCourtPlayers, currentSetSubstitutions])

    // Display players: simulated when there are planned subs
    const displayOnCourtPlayers = simulatedState.onCourtPlayers

    // Determinar jugadora que sale y si es líbero (using display players)
    const playerOutData = playerOut
        ? displayOnCourtPlayers.find(p => p.player.id === playerOut.id)?.player
        : null
    const playerOutIsLibero = playerOutData ? isLibero(playerOutData) : false

    // Enriquecer parejas con datos de jugadoras para mostrar en panel
    const enrichedPairs = useMemo(() => {
        return currentSetSubstitutions.pairs.map(pair => {
            const starter = allPlayers.find(p => p.id === pair.starterId)
            const substitute = allPlayers.find(p => p.id === pair.substituteId)

            // Determinar quién está en pista
            const starterOnCourt = onCourtPlayers.find(p => p.player.id === pair.starterId)
            const subOnCourt = onCourtPlayers.find(p => p.player.id === pair.substituteId)

            return {
                ...pair,
                starter,
                substitute,
                starterOnCourt,
                subOnCourt,
                canReturn: pair.usesCount === 1 && (starterOnCourt || subOnCourt)
            }
        })
    }, [currentSetSubstitutions.pairs, allPlayers, onCourtPlayers])

    // Filtrar banquillo basado en rol de jugadora que sale
    const filteredBenchPlayers = useMemo(() => {
        // Obtener IDs de jugadoras involucradas en parejas activas que AÚN pueden hacer cambios
        const activePairedPlayerIds = new Set<string>()
        // Obtener IDs de jugadoras que ya completaron el ciclo (2/2)
        const exhaustedPlayerIds = new Set<string>()

        currentSetSubstitutions.pairs.forEach(pair => {
            if (pair.usesCount >= 2) {
                // Pareja agotada: jugadoras no pueden volver a cambiar
                exhaustedPlayerIds.add(pair.starterId)
                exhaustedPlayerIds.add(pair.substituteId)
            } else {
                // Pareja activa (1/2): aún pueden hacer el cambio de vuelta
                activePairedPlayerIds.add(pair.starterId)
                activePairedPlayerIds.add(pair.substituteId)
            }
        })

        // Sin selección: mostrar jugadoras de CAMPO que NO estén en parejas activas
        // PERO incluir las agotadas (se mostrarán deshabilitadas)
        if (!playerOutData) {
            return benchPlayers.filter(p =>
                !isLibero(p) &&
                (!activePairedPlayerIds.has(p.id) || exhaustedPlayerIds.has(p.id))
            )
        }

        // Si sale un líbero, solo mostrar líberos
        if (playerOutIsLibero) {
            return benchPlayers.filter(p => isLibero(p))
        }

        // Si sale jugadora de campo, solo mostrar jugadoras de campo compatibles
        // - NO líberos
        // - Si la jugadora que sale tiene pareja, solo mostrar su pareja
        // - Si no tiene pareja, mostrar solo jugadoras sin pareja activa (pero incluir agotadas)
        const playerOutPair = currentSetSubstitutions.pairs.find(
            p => p.starterId === playerOut?.id || p.substituteId === playerOut?.id
        )

        if (playerOutPair) {
            // La jugadora que sale tiene pareja: solo mostrar su pareja
            const partnerId = playerOutPair.starterId === playerOut?.id
                ? playerOutPair.substituteId
                : playerOutPair.starterId
            return benchPlayers.filter(p => p.id === partnerId && !isLibero(p))
        } else {
            // No tiene pareja: mostrar jugadoras de campo sin pareja activa + las agotadas
            return benchPlayers.filter(p =>
                !isLibero(p) &&
                (!activePairedPlayerIds.has(p.id) || exhaustedPlayerIds.has(p.id))
            )
        }
    }, [benchPlayers, playerOutData, playerOutIsLibero, playerOut, currentSetSubstitutions.pairs])

    // Función para verificar si una jugadora está disponible para selección
    const isPlayerAvailable = (playerId: string) => {
        // Buscar si esta jugadora está en una pareja
        const pair = currentSetSubstitutions.pairs.find(
            p => p.starterId === playerId || p.substituteId === playerId
        )

        // Si no tiene pareja, puede ser seleccionada
        if (!pair) return true

        // Si la pareja está completa (2/2), NO puede ser seleccionada
        if (pair.usesCount >= 2) return false

        // Si tiene pareja activa (1/2):
        // - Si hay playerOut seleccionado: solo puede si es su pareja
        // - Si NO hay playerOut seleccionado: deshabilitar (debe usar botón ♻ o seleccionar pareja primero)
        if (pair.usesCount === 1) {
            if (playerOut) {
                // Solo permitir si playerOut es su pareja
                const isPartner =
                    (pair.starterId === playerOut.id && pair.substituteId === playerId) ||
                    (pair.substituteId === playerOut.id && pair.starterId === playerId)
                return isPartner
            } else {
                // Sin playerOut seleccionado: deshabilitar jugadoras en parejas activas
                return false
            }
        }

        return true
    }

    if (!isOpen) return null

    // Validate and get player data for current selection
    const validateCurrentSelection = () => {
        if (!playerOut || !playerInId) return null

        let outPlayerData = displayOnCourtPlayers.find(p => p.player.id === playerOut.id)?.player
        if (!outPlayerData) {
            outPlayerData = allPlayers.find(p => p.id === playerOut.id)
        }

        const inPlayerData = benchPlayers.find(p => p.id === playerInId) || allPlayers.find(p => p.id === playerInId)

        if (!outPlayerData || !inPlayerData) {
            toast.error('Jugadora no encontrada')
            return null
        }

        if (!isValidSubstitution(outPlayerData, inPlayerData)) {
            toast.error('Sustitución no válida: los cambios deben ser campo por campo o líbero por líbero')
            return null
        }

        // Validate with batch helpers (always validate against simulated state)
        const validation = canAddToBatch(planned, playerOut.id, playerInId, simulatedState)
        if (!validation.valid) {
            toast.error(validation.reason || 'No se puede realizar esta sustitución')
            return null
        }

        return { outPlayerData, inPlayerData }
    }

    // Add current selection to planned list (without confirming)
    const handleAddToPlanned = () => {
        const validated = validateCurrentSelection()
        if (!validated || !playerOut || !playerInId) return

        const { outPlayerData, inPlayerData } = validated

        const newPlanned: PlannedSub = {
            outPlayerId: playerOut.id,
            inPlayerId: playerInId,
            outPosition: playerOut.position,
            outPlayer: outPlayerData,
            inPlayer: inPlayerData
        }
        setPlanned([...planned, newPlanned])

        // Reset selection (stay in modal for more subs)
        setPlayerOut(null)
        setPlayerInId(null)
        toast.success(`Cambio añadido (${planned.length + 1} en lista)`)
    }

    // Confirm immediately: if planned.length > 0, confirm all planned + current
    // If planned.length === 0, confirm only current selection
    const handleConfirmAll = () => {
        // If there's a current selection, validate and add to planned first
        if (playerOut && playerInId) {
            const validated = validateCurrentSelection()
            if (!validated) return

            const { outPlayerData, inPlayerData } = validated

            // Create full list including current selection
            const allSubs: PlannedSub[] = [
                ...planned,
                {
                    outPlayerId: playerOut.id,
                    inPlayerId: playerInId,
                    outPosition: playerOut.position,
                    outPlayer: outPlayerData,
                    inPlayer: inPlayerData
                }
            ]

            // Apply all substitutions
            for (const sub of allSubs) {
                onConfirm({
                    playerOutId: sub.outPlayerId,
                    playerInId: sub.inPlayerId,
                    position: sub.outPosition
                })
            }
        } else if (planned.length > 0) {
            // No current selection, just confirm planned
            for (const sub of planned) {
                onConfirm({
                    playerOutId: sub.outPlayerId,
                    playerInId: sub.inPlayerId,
                    position: sub.outPosition
                })
            }
        } else {
            return // Nothing to confirm
        }

        // Clear and close
        setPlanned([])
        setPlayerOut(null)
        setPlayerInId(null)
        onClose()
    }

    // Remove a planned substitution
    const handleRemovePlanned = (index: number) => {
        setPlanned(planned.filter((_, i) => i !== index))
    }

    // Clear all planned substitutions
    const handleClearPlanned = () => {
        setPlanned([])
        setPlayerOut(null)
        setPlayerInId(null)
    }

    // Acción rápida para vuelta de pareja (♻)
    const handleQuickReturn = (pair: typeof enrichedPairs[0]) => {
        if (pair.starterOnCourt) {
            // Starter está en pista → sale starter, entra suplente
            setPlayerOut({
                id: pair.starterId,
                position: pair.starterOnCourt.position
            })
            setPlayerInId(pair.substituteId)
        } else if (pair.subOnCourt) {
            // Suplente está en pista → sale suplente, entra starter
            setPlayerOut({
                id: pair.substituteId,
                position: pair.subOnCourt.position
            })
            setPlayerInId(pair.starterId)
        }
    }

    const handleClose = () => {
        setPlayerOut(null)
        setPlayerInId(null)
        onClose()
    }

    const canConfirm = playerOut !== null && playerInId !== null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-900 rounded-xl shadow-2xl w-full max-w-lg p-6 border border-zinc-800 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="text-center mb-4">
                    <h2 className="text-2xl font-bold text-white mb-2">
                        Sustitución
                    </h2>
                    <p className="text-zinc-400 text-sm">
                        Set {currentSetNumber} - Selecciona jugadora que sale y entra
                    </p>
                </div>

                {/* PLANNED SUBSTITUTIONS PANEL (shows when there are planned subs) */}
                {planned.length > 0 && (
                    <div className="mb-4 p-3 bg-blue-900/20 rounded-lg border border-blue-800/50">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-semibold text-blue-300 uppercase tracking-wide">
                                Cambios planificados
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-blue-200">
                                    {planned.length} / {6 - currentSetSubstitutions.totalSubstitutions}
                                </span>
                                {planned.length > 0 && (
                                    <button
                                        onClick={handleClearPlanned}
                                        className="text-xs text-red-400 hover:text-red-300 px-1.5 py-0.5 bg-red-900/20 rounded"
                                    >
                                        Limpiar
                                    </button>
                                )}
                            </div>
                        </div>

                        {planned.length === 0 ? (
                            <p className="text-xs text-zinc-500 text-center py-2">
                                Selecciona jugadoras para añadir cambios a la lista
                            </p>
                        ) : (
                            <div className="space-y-1">
                                {planned.map((sub, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between text-xs p-1.5 bg-zinc-800/50 rounded"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-zinc-500 w-4">P{sub.outPosition}</span>
                                            <span className="text-red-400">#{sub.outPlayer.number}</span>
                                            <span className="text-zinc-400">{sub.outPlayer.name}</span>
                                            <span className="text-zinc-600">→</span>
                                            <span className="text-emerald-400">#{sub.inPlayer.number}</span>
                                            <span className="text-zinc-400">{sub.inPlayer.name}</span>
                                        </div>
                                        <button
                                            onClick={() => handleRemovePlanned(idx)}
                                            className="text-zinc-500 hover:text-red-400 p-1"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* PANEL DE ESTADO DE SUSTITUCIONES */}
                <div className="mb-3 p-3 bg-zinc-900/30 rounded-lg border border-zinc-800/50">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                            Sustituciones (Set {currentSetNumber})
                        </h3>
                        <span className="text-xs font-bold text-white">
                            {currentSetSubstitutions.totalSubstitutions}{planned.length > 0 ? ` + ${planned.length}` : ''} / 6
                        </span>
                    </div>

                    {/* Lista de Parejas compacta */}
                    {enrichedPairs.length > 0 && (
                        <div className="space-y-1">
                            {enrichedPairs.map((pair, idx) => {
                                // Get position of whoever is on court
                                const onCourtPosition = pair.starterOnCourt?.position || pair.subOnCourt?.position
                                return (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between text-xs p-1.5 bg-zinc-800/30 rounded"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            {onCourtPosition && (
                                                <span className="text-zinc-500 font-mono text-[10px] w-5">P{onCourtPosition}</span>
                                            )}
                                            <span className="text-zinc-300">
                                                #{pair.starter?.number} {pair.starter?.name}
                                            </span>
                                            <span className="text-zinc-600">↔</span>
                                            <span className="text-zinc-300">
                                                #{pair.substitute?.number} {pair.substitute?.name}
                                            </span>
                                            <span className={`text-[10px] ${pair.usesCount === 2 ? 'text-red-400' : 'text-emerald-400'
                                                }`}>
                                                ({pair.usesCount}/2)
                                            </span>
                                        </div>

                                        {/* Icono de acción */}
                                        {pair.usesCount === 1 && pair.canReturn ? (
                                            <button
                                                onClick={() => handleQuickReturn(pair)}
                                                className="p-1 hover:bg-emerald-600/20 rounded transition-colors"
                                                title="Hacer vuelta de esta pareja"
                                            >
                                                <RefreshCw size={12} className="text-emerald-400" />
                                            </button>
                                        ) : (
                                            <Lock size={11} className="text-zinc-600" />
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Visual Indicator */}
                {playerOut && playerInId && (
                    <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-red-400 font-bold">SALE:</span>
                                <span className="text-white">
                                    {onCourtPlayers.find(p => p.player.id === playerOut.id)?.player.name} (#{onCourtPlayers.find(p => p.player.id === playerOut.id)?.player.number})
                                </span>
                            </div>
                            <span className="text-zinc-500">→</span>
                            <div className="flex items-center gap-2">
                                <span className="text-emerald-400 font-bold">ENTRA:</span>
                                <span className="text-white">
                                    {benchPlayers.find(p => p.id === playerInId)?.name} (#{benchPlayers.find(p => p.id === playerInId)?.number})
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* En Pista Section */}
                <div className="mb-6">
                    <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        En Pista {planned.length > 0 ? '(simulado)' : ''}
                    </h3>
                    <RotationGridStandard
                        players={displayOnCourtPlayers.map(entry => {
                            // Check if player is already in planned
                            const inPlanned = isPlayerInBatch(planned, entry.player.id)
                            const isDisabled = !isPlayerAvailable(entry.player.id) || inPlanned
                            return {
                                position: entry.position,
                                playerId: entry.player.id,
                                number: String(entry.player.number),
                                name: entry.player.name,
                                role: entry.player.role || '',
                                isSelected: playerOut?.id === entry.player.id,
                                disabled: isDisabled
                            }
                        })}
                        selectable={true}
                        compact={false}
                        onSlotClick={(position, playerId) => {
                            if (playerId && isPlayerAvailable(playerId) && !isPlayerInBatch(planned, playerId)) {
                                setPlayerOut({ id: playerId, position })
                            }
                        }}
                    />
                </div>

                {/* Banquillo Section - Grid 3x2 */}
                <div className="mb-6">
                    <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        Banquillo (Selecciona quién entra)
                    </h3>

                    {/* Grid 3x2 igual que en pista */}
                    <div className="flex flex-col gap-1">
                        {/* Fila 1 - Posiciones 1, 2, 3 */}
                        <div className="flex justify-center gap-1 w-full border-b border-zinc-800/50 pb-1">
                            {[0, 1, 2].map(index => {
                                const player = filteredBenchPlayers[index]
                                const isDisabled = player ? !isPlayerAvailable(player.id) : true

                                return player ? (
                                    <PlayerCard
                                        key={player.id}
                                        number={player.number}
                                        name={player.name}
                                        role={player.role}
                                        isSelected={playerInId === player.id}
                                        disabled={isDisabled}
                                        onClick={() => !isDisabled && setPlayerInId(player.id)}
                                        compact={false}
                                    />
                                ) : (
                                    <PlayerCard
                                        key={`empty-${index}`}
                                        number=""
                                        name=""
                                        compact={false}
                                        disabled={true}
                                        className="border-dashed opacity-40"
                                    />
                                )
                            })}
                        </div>

                        {/* Fila 2 - Posiciones 4, 5, 6 */}
                        <div className="flex justify-center gap-1 w-full pt-1">
                            {[3, 4, 5].map(index => {
                                const player = filteredBenchPlayers[index]
                                const isDisabled = player ? !isPlayerAvailable(player.id) : true

                                return player ? (
                                    <PlayerCard
                                        key={player.id}
                                        number={player.number}
                                        name={player.name}
                                        role={player.role}
                                        isSelected={playerInId === player.id}
                                        disabled={isDisabled}
                                        onClick={() => !isDisabled && setPlayerInId(player.id)}
                                        compact={false}
                                    />
                                ) : (
                                    <PlayerCard
                                        key={`empty-${index}`}
                                        number=""
                                        name=""
                                        compact={false}
                                        disabled={true}
                                        className="border-dashed opacity-40"
                                    />
                                )
                            })}
                        </div>
                    </div>

                    {filteredBenchPlayers.length === 0 && (
                        <div className="mt-4 p-4 text-center text-sm text-zinc-500 bg-zinc-800/30 rounded-lg border border-zinc-700/50">
                            {playerOutData
                                ? `No hay ${playerOutIsLibero ? 'líberos' : 'jugadoras de campo'} disponibles`
                                : 'No hay jugadoras disponibles en el banquillo'
                            }
                        </div>
                    )}
                </div>

                {/* Actions - 2 rows */}
                <div className="space-y-3 mt-auto">
                    {/* Row 1: Add to list (only shows when there's a selection) */}
                    {canConfirm && (
                        <Button
                            variant="secondary"
                            size="lg"
                            className="w-full border-blue-600/50 text-blue-400 hover:bg-blue-900/20"
                            onClick={handleAddToPlanned}
                        >
                            + Añadir cambio {planned.length > 0 ? 'a la lista' : ''}
                        </Button>
                    )}

                    {/* Row 2: Confirm + Cancel side by side */}
                    <div className="flex gap-2">
                        <Button
                            variant="primary"
                            size="lg"
                            className={`flex-1 ${(canConfirm || planned.length > 0)
                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                : 'bg-zinc-700 cursor-not-allowed opacity-50'
                                } text-white`}
                            icon={Check}
                            onClick={handleConfirmAll}
                            disabled={!canConfirm && planned.length === 0}
                        >
                            Confirmar ({planned.length + (canConfirm ? 1 : 0)})
                        </Button>

                        <Button
                            variant="secondary"
                            className="flex-1"
                            icon={X}
                            onClick={handleClose}
                        >
                            Cancelar
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
