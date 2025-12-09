import { useState, useMemo } from 'react'
import { Check, X, RefreshCw, Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PlayerV2 } from '@/stores/matchStoreV2'
import { isLibero, isValidSubstitution } from '@/lib/volleyball/substitutionHelpers'
import { toast } from 'sonner'

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
        // Obtener IDs de jugadoras involucradas en parejas activas
        const pairedPlayerIds = new Set<string>()
        currentSetSubstitutions.pairs.forEach(pair => {
            pairedPlayerIds.add(pair.starterId)
            pairedPlayerIds.add(pair.substituteId)
        })

        // Sin selección: mostrar solo jugadoras de CAMPO que NO estén en parejas activas
        if (!playerOutData) {
            return benchPlayers.filter(p => !isLibero(p) && !pairedPlayerIds.has(p.id))
        }

        // Si sale un líbero, solo mostrar líberos
        if (playerOutIsLibero) {
            return benchPlayers.filter(p => isLibero(p))
        }

        // Si sale jugadora de campo, solo mostrar jugadoras de campo compatibles
        // - NO líberos
        // - Si la jugadora que sale tiene pareja, solo mostrar su pareja
        // - Si no tiene pareja, mostrar solo jugadoras sin pareja
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
            // No tiene pareja: mostrar jugadoras de campo sin pareja
            return benchPlayers.filter(p => !isLibero(p) && !pairedPlayerIds.has(p.id))
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

                    {/* Barra de progreso compacta */}
                    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mb-2">
                        <div
                            className={`h-full transition-all ${currentSetSubstitutions.totalSubstitutions >= 6
                                ? 'bg-red-500'
                                : 'bg-emerald-500'
                                }`}
                            style={{
                                width: `${(currentSetSubstitutions.totalSubstitutions / 6) * 100}%`
                            }}
                        />
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
                    <div className="grid grid-cols-3 gap-2">
                        {onCourtPlayers
                            .sort((a, b) => a.position - b.position)
                            .map(entry => {
                                const isSelected = playerOut?.id === entry.player.id
                                return (
                                    <button
                                        key={entry.player.id}
                                        onClick={() => setPlayerOut({ id: entry.player.id, position: entry.position })}
                                        className={`p-2 rounded-lg border-2 transition-all text-left relative ${isSelected
                                            ? 'bg-red-500/20 border-red-500 ring-2 ring-red-500/30'
                                            : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800'
                                            }`}
                                    >
                                        {isLibero(entry.player) && (
                                            <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold">
                                                LÍBERO
                                            </span>
                                        )}
                                        <div className="flex flex-col items-center justify-center">
                                            <span className="text-xs font-bold text-zinc-400 mb-0.5">P{entry.position}</span>
                                            <span className="text-4xl font-bold text-white mb-1">{entry.player.number}</span>
                                            <div className="text-xs text-zinc-300 truncate text-center w-full">{entry.player.name}</div>
                                        </div>
                                    </button>
                                )
                            })}
                    </div>
                </div>

                {/* Banquillo Section */}
                <div className="mb-6">
                    <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        Banquillo (Selecciona quién entra)
                    </h3>
                    {filteredBenchPlayers.length === 0 ? (
                        <div className="p-4 text-center text-sm text-zinc-500 bg-zinc-800/30 rounded-lg border border-zinc-700/50">
                            {playerOutData
                                ? `No hay ${playerOutIsLibero ? 'líberos' : 'jugadoras de campo'} disponibles`
                                : 'No hay jugadoras disponibles en el banquillo'
                            }
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                            {filteredBenchPlayers.map(player => {
                                const isDisabled = !isPlayerAvailable(player.id)
                                return (
                                    <button
                                        key={player.id}
                                        onClick={() => !isDisabled && setPlayerInId(player.id)}
                                        disabled={isDisabled}
                                        className={`p-3 rounded-lg transition-all relative text-left ${isDisabled
                                            ? 'opacity-40 cursor-not-allowed bg-zinc-800/50 border border-zinc-800'
                                            : playerInId === player.id
                                                ? 'bg-emerald-500/20 border-2 border-emerald-500 ring-2 ring-emerald-500/30'
                                                : 'bg-zinc-800 border border-zinc-700 hover:border-zinc-600'
                                            }`}
                                    >
                                        {isLibero(player) && (
                                            <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold">
                                                LÍBERO
                                            </span>
                                        )}
                                        {isDisabled && (
                                            <span className="absolute -top-1 -left-1 bg-zinc-700 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold">
                                                🔒
                                            </span>
                                        )}
                                        <div className="flex flex-col items-center justify-center">
                                            <span className="text-4xl font-bold text-white mb-1">{player.number}</span>
                                            <div className="text-xs text-zinc-300 truncate text-center w-full">{player.name}</div>
                                            {player.role && player.role !== 'Starter' && (
                                                <span className="text-[9px] text-zinc-500 uppercase font-bold mt-0.5">{player.role}</span>
                                            )}
                                        </div>
                                    </button>
                                )
                            })}
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
