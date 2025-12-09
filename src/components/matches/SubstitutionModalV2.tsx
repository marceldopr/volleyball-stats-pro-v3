import { useState } from 'react'
import { ArrowLeftRight, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PlayerV2 } from '@/stores/matchStoreV2'

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
}

export function SubstitutionModalV2({
    isOpen,
    onClose,
    onConfirm,
    onCourtPlayers,
    benchPlayers,
    currentSetNumber
}: SubstitutionModalV2Props) {
    const [playerOut, setPlayerOut] = useState<{ id: string; position: 1 | 2 | 3 | 4 | 5 | 6 } | null>(null)
    const [playerInId, setPlayerInId] = useState<string | null>(null)

    if (!isOpen) return null

    const handleConfirm = () => {
        if (!playerOut || !playerInId) return

        onConfirm({
            playerOutId: playerOut.id,
            playerInId: playerInId,
            position: playerOut.position
        })

        // Reset state
        setPlayerOut(null)
        setPlayerInId(null)
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
                    <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                        <ArrowLeftRight size={24} className="text-blue-500" />
                        Sustitución
                    </h2>
                    <p className="text-zinc-400 text-sm">
                        Set {currentSetNumber} - Selecciona jugadora que sale y entra
                    </p>
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
                            <ArrowLeftRight size={16} className="text-blue-400" />
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
                                        className={`p-3 rounded-lg border-2 transition-all text-left ${isSelected
                                                ? 'bg-red-500/20 border-red-500 ring-2 ring-red-500/30'
                                                : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-bold text-zinc-400">P{entry.position}</span>
                                            {entry.player.role && entry.player.role !== 'Starter' && (
                                                <span className="text-[10px] text-zinc-500 uppercase font-bold">{entry.player.role}</span>
                                            )}
                                        </div>
                                        <div className="text-xl font-bold text-white mb-0.5">{entry.player.number}</div>
                                        <div className="text-xs text-zinc-300 truncate">{entry.player.name}</div>
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
                    {benchPlayers.length === 0 ? (
                        <div className="p-4 text-center text-sm text-zinc-500 bg-zinc-800/30 rounded-lg border border-zinc-700/50">
                            No hay jugadoras disponibles en el banquillo
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                            {benchPlayers.map(player => {
                                const isSelected = playerInId === player.id
                                return (
                                    <button
                                        key={player.id}
                                        onClick={() => setPlayerInId(player.id)}
                                        className={`p-3 rounded-lg border-2 transition-all text-left ${isSelected
                                                ? 'bg-emerald-500/20 border-emerald-500 ring-2 ring-emerald-500/30'
                                                : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xl font-bold text-white">{player.number}</span>
                                            {player.role && player.role !== 'Starter' && (
                                                <span className="text-[10px] text-zinc-500 uppercase font-bold">{player.role}</span>
                                            )}
                                        </div>
                                        <div className="text-sm text-zinc-300 truncate">{player.name}</div>
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
