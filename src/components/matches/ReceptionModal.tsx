import { useState } from 'react'
import { X, Timer, RefreshCw, Users } from 'lucide-react'
import { RotationGridStandard, type RotationSlotPlayer } from '../match/RotationGridStandard'

interface ReceptionModalV2Props {
    isOpen: boolean
    onClose: () => void
    onConfirm: (playerId: string, rating: 0 | 1 | 2 | 3 | 4) => void
    players: Array<{
        id: string
        name: string
        number: string | number
        role: string
    }>
    currentSet: number
    rotation?: Array<{ position: number; player: { id: string; name: string; number: number; role: string } }>
    getPlayerDisplay: (playerId: string | null | undefined) => { number: string; name: string; role: string }
    // Pre-reception action props
    onTimeoutLocal?: () => void
    onTimeoutVisitor?: () => void
    onSubstitution?: () => void
    onLiberoSwap?: () => void
    timeoutsHome?: number
    timeoutsAway?: number
    substitutionsUsed?: number
    ourSide?: 'home' | 'away'
    liberoAvailable?: boolean
}

const RATING_CONFIG = {
    0: { label: 'Error', color: 'bg-red-600 hover:bg-red-700 active:bg-red-800', textColor: 'text-white' },
    1: { label: 'Negativa', color: 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700', textColor: 'text-white' },
    2: { label: 'Neutra', color: 'bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700', textColor: 'text-white' },
    3: { label: 'Positiva', color: 'bg-green-500 hover:bg-green-600 active:bg-green-700', textColor: 'text-white' },
    4: { label: 'Perfecta', color: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800', textColor: 'text-white' }
}

export function ReceptionModal({
    isOpen,
    onClose,
    onConfirm,
    players: _players,
    currentSet,
    rotation,
    getPlayerDisplay,
    // Pre-reception actions
    onTimeoutLocal,
    onTimeoutVisitor,
    onSubstitution,
    onLiberoSwap,
    timeoutsHome = 0,
    timeoutsAway = 0,
    substitutionsUsed = 0,
    ourSide = 'home',
    liberoAvailable = false
}: ReceptionModalV2Props) {
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)

    if (!isOpen) return null

    const handlePlayerClick = (playerId: string) => {
        setSelectedPlayerId(playerId)
    }

    const handleRatingSelect = (rating: 0 | 1 | 2 | 3 | 4) => {
        if (selectedPlayerId) {
            onConfirm(selectedPlayerId, rating)
            setSelectedPlayerId(null)
        }
    }

    const handleClose = () => {
        setSelectedPlayerId(null)
        onClose()
    }

    // Helper to get player ID at a position (exactly like in LiveMatchScoutingV2)
    const getPlayerAtPosition = (pos: number) => {
        return rotation?.find(r => r.position === pos)?.player
    }

    // Prepare players for RotationGridStandard
    const gridPlayers: RotationSlotPlayer[] = [1, 2, 3, 4, 5, 6].map(pos => {
        const player = getPlayerAtPosition(pos)
        const display = getPlayerDisplay(player?.id || null)

        return {
            position: pos as 1 | 2 | 3 | 4 | 5 | 6,
            playerId: player?.id || null,
            number: display.number,
            name: display.name,
            role: display.role,
            isSelected: selectedPlayerId === player?.id
        }
    })

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
            <div className="bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md border border-zinc-800">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                    <div>
                        <h2 className="text-xl font-bold text-white">Recepción</h2>
                        <p className="text-xs text-zinc-400 mt-0.5">Set {currentSet}</p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4">
                    {/* Pre-reception actions row - Compact */}
                    {(onTimeoutLocal || onTimeoutVisitor || onSubstitution || onLiberoSwap) && (
                        <div className="mb-3 p-1.5 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                            <p className="text-[9px] text-zinc-500 uppercase tracking-wide mb-1.5 text-center font-semibold">Acciones previas</p>
                            <div className="grid grid-cols-4 gap-2">
                                {/* 1. T.M. Local */}
                                {onTimeoutLocal && (
                                    <button
                                        onClick={onTimeoutLocal}
                                        disabled={(ourSide === 'home' ? timeoutsHome : timeoutsAway) >= 2}
                                        className="flex flex-col items-center justify-center p-2 bg-zinc-700/40 hover:bg-zinc-600/60 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-zinc-700/30 w-full h-12"
                                        title="Tiempo Muerto Local"
                                    >
                                        <div className="flex items-center gap-1.5 align-middle h-full">
                                            <Timer size={20} className="text-blue-400" />
                                            <span className="text-xs text-zinc-300 font-mono font-bold leading-none translate-y-[1px]">
                                                {ourSide === 'home' ? timeoutsHome : timeoutsAway}<span className="text-zinc-500 text-[9px] ml-0.5">/2</span>
                                            </span>
                                        </div>
                                    </button>
                                )}

                                {/* 2. Cambio (Substitution) */}
                                {onSubstitution && (
                                    <button
                                        onClick={onSubstitution}
                                        className="flex flex-col items-center justify-center p-2 bg-zinc-700/40 hover:bg-zinc-600/60 rounded-xl transition-colors border border-zinc-700/30 w-full h-12"
                                        title="Sustitución"
                                    >
                                        <div className="flex items-center gap-1.5 align-middle h-full">
                                            <RefreshCw size={20} className="text-emerald-400" />
                                            <span className="text-xs text-zinc-300 font-mono font-bold leading-none translate-y-[1px]">
                                                {substitutionsUsed}<span className="text-zinc-500 text-[9px] ml-0.5">/6</span>
                                            </span>
                                        </div>
                                    </button>
                                )}

                                {/* 3. Líbero */}
                                {onLiberoSwap && liberoAvailable && (
                                    <button
                                        onClick={onLiberoSwap}
                                        className="flex flex-col items-center justify-center p-2 bg-zinc-700/40 hover:bg-zinc-600/60 rounded-xl transition-colors border border-zinc-700/30 w-full h-12"
                                        title="Cambio de Líbero"
                                    >
                                        <div className="flex items-center justify-center h-full">
                                            <Users size={22} className="text-purple-400" />
                                        </div>
                                    </button>
                                )}

                                {/* 4. T.M. Visitante */}
                                {onTimeoutVisitor && (
                                    <button
                                        onClick={onTimeoutVisitor}
                                        disabled={(ourSide === 'home' ? timeoutsAway : timeoutsHome) >= 2}
                                        className="flex flex-col items-center justify-center p-2 bg-zinc-700/40 hover:bg-zinc-600/60 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-zinc-700/30 w-full h-12"
                                        title="Tiempo Muerto Visitante"
                                    >
                                        <div className="flex items-center gap-1.5 align-middle h-full">
                                            <Timer size={20} className="text-orange-400" />
                                            <span className="text-xs text-zinc-300 font-mono font-bold leading-none translate-y-[1px]">
                                                {ourSide === 'home' ? timeoutsAway : timeoutsHome}<span className="text-zinc-500 text-[9px] ml-0.5">/2</span>
                                            </span>
                                        </div>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <p className="text-xs text-zinc-400 mb-3">
                        1. Selecciona la jugadora que recibió
                    </p>

                    {/* Rotation Grid - using RotationGridStandard */}
                    <div className="mb-4">
                        <RotationGridStandard
                            players={gridPlayers}
                            selectable={true}
                            compact={false}
                            onSlotClick={(_position, playerId) => {
                                if (playerId) {
                                    handlePlayerClick(playerId)
                                }
                            }}
                        />
                    </div>

                    {/* Rating Buttons */}
                    <p className="text-xs text-zinc-400 mb-2">
                        2. Selecciona la calidad de la recepción
                    </p>

                    {/* Horizontal Rating Buttons - 0 to 4 */}
                    <div className="grid grid-cols-5 gap-2 mb-3">
                        {[0, 1, 2, 3, 4].map((rating) => {
                            const config = RATING_CONFIG[rating as keyof typeof RATING_CONFIG]
                            const isDisabled = !selectedPlayerId
                            return (
                                <button
                                    key={rating}
                                    onClick={() => handleRatingSelect(rating as 0 | 1 | 2 | 3 | 4)}
                                    disabled={isDisabled}
                                    className={`aspect-square rounded-lg transition-all flex flex-col items-center justify-center gap-1 p-2 ${isDisabled
                                        ? 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
                                        : `${config.color} ${config.textColor} transform hover:scale-105 active:scale-95`
                                        }`}
                                >
                                    <span className="text-2xl leading-none font-black">{rating}</span>
                                    <span className="text-[9px] font-semibold leading-tight text-center">{config.label}</span>
                                </button>
                            )
                        })}
                    </div>

                    {/* Rating Explanations */}
                    <div className="p-3 bg-zinc-800/50 rounded-lg text-[10px] text-zinc-400 space-y-1 leading-relaxed">
                        <div><strong className="text-emerald-400">4:</strong> Pase perfecto, colocadora con todas las opciones</div>
                        <div><strong className="text-green-400">3:</strong> Buen pase, colocadora puede armar</div>
                        <div><strong className="text-yellow-400">2:</strong> Pase complicado, opciones limitadas</div>
                        <div><strong className="text-orange-400">1:</strong> Pase difícil, muy pocas opciones</div>
                        <div><strong className="text-red-400">0:</strong> Error directo, ace rival</div>
                    </div>
                </div>
            </div>
        </div>
    )
}
