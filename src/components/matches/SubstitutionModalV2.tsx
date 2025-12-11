import { useState, useMemo } from 'react'
import { Check, X, RefreshCw, Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PlayerV2 } from '@/stores/matchStoreV2'
import { isLibero, isValidSubstitution } from '@/lib/volleyball/substitutionHelpers'
import { toast } from 'sonner'
import { RotationGridStandard } from '../match/RotationGridStandard'
import { PlayerCard } from '../match/PlayerCard'

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

    // Determinar jugadora que sale y si es líbero
    const playerOutData = playerOut
        ? onCourtPlayers.find(p => p.player.id === playerOut.id)?.player
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

        // Si tiene pareja activa (1/2), solo puede si está emparejada con playerOut
        if (playerOut) {
            const isPartner =
                (pair.starterId === playerOut.id && pair.substituteId === playerId) ||
                (pair.substituteId === playerOut.id && pair.starterId === playerId)
            return isPartner
        }

        return true
    }

    if (!isOpen) return null

    const handleConfirm = () => {
        if (!playerOut || !playerInId) return

        // Buscar jugadora que sale (puede estar en pista o ser el líbero)
        let playerOutData = onCourtPlayers.find(p => p.player.id === playerOut.id)?.player

        // Si no está en onCourtPlayers, buscar en allPlayers (caso líbero)
        if (!playerOutData) {
            playerOutData = allPlayers.find(p => p.id === playerOut.id)
        }

        const playerInData = benchPlayers.find(p => p.id === playerInId) || allPlayers.find(p => p.id === playerInId)

        if (!playerOutData || !playerInData) {
            toast.error('Jugadora no encontrada')
            return
        }

        // Validación de seguridad
        if (!isValidSubstitution(playerOutData, playerInData)) {
            toast.error('Sustitución no válida: los cambios deben ser campo por campo o líbero por líbero')
            return
        }

        onConfirm({
            playerOutId: playerOut.id,
            playerInId: playerInId,
            position: playerOut.position
        })

        // Reset state
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
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">
                        Sustitución
                    </h2>
                    <p className="text-zinc-400 text-sm">
                        Set {currentSetNumber} - Selecciona jugadora que sale y entra
                    </p>
                </div>

                {/* PANEL DE ESTADO DE SUSTITUCIONES */}
                <div className="mb-3 p-3 bg-zinc-900/30 rounded-lg border border-zinc-800/50">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                            Sustituciones (Set {currentSetNumber})
                        </h3>
                        <span className="text-xs font-bold text-white">
                            {currentSetSubstitutions.totalSubstitutions} / 6
                        </span>
                    </div>

                    {/* Lista de Parejas compacta */}
                    {enrichedPairs.length > 0 && (
                        <div className="space-y-1">
                            {enrichedPairs.map((pair, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between text-xs p-1.5 bg-zinc-800/30 rounded"
                                >
                                    <div className="flex items-center gap-1.5">
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
                            ))}
                        </div>
                    )}

                    {enrichedPairs.length === 0 && (
                        <p className="text-[10px] text-zinc-600 italic">
                            Sin parejas activas
                        </p>
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
                        En Pista (Selecciona quién sale)
                    </h3>
                    <RotationGridStandard
                        players={onCourtPlayers.map(entry => ({
                            position: entry.position,
                            playerId: entry.player.id,
                            number: String(entry.player.number),
                            name: entry.player.name,
                            role: entry.player.role || '',
                            isSelected: playerOut?.id === entry.player.id
                        }))}
                        selectable={true}
                        compact={false}
                        onSlotClick={(position, playerId) => {
                            if (playerId) {
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

                {/* Actions */}
                <div className="space-y-3 mt-auto">
                    <Button
                        variant="primary"
                        size="lg"
                        className={`w-full ${canConfirm
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'bg-zinc-700 cursor-not-allowed opacity-50'
                            } text-white`}
                        icon={Check}
                        onClick={handleConfirm}
                        disabled={!canConfirm}
                    >
                        Confirmar Sustitución
                    </Button>

                    <Button
                        variant="secondary"
                        className="w-full"
                        icon={X}
                        onClick={handleClose}
                    >
                        Cancelar
                    </Button>
                </div>
            </div>
        </div>
    )
}
