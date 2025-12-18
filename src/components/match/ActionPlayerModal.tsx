import { PlayerV2 } from '@/stores/matchStore'
import { PlayerCard } from './PlayerCard'
import { ActionType, getActionTitle } from '@/hooks/match/useActionPlayerModal'

interface ActionPlayerModalV2Props {
    isOpen: boolean
    actionType: ActionType | null
    currentSet: number
    onCourtPlayers: {
        position: 1 | 2 | 3 | 4 | 5 | 6
        player: PlayerV2
    }[]
    onConfirm: (playerId: string) => void
    onClose: () => void
}

// Filter eligible players based on action type
function getEligiblePositions(actionType: ActionType | null): Set<number> {
    switch (actionType) {
        case 'serve_point':
        case 'service_error':
            // Only P1 (serving position)
            return new Set([1])

        case 'block_point':
        case 'attack_blocked':
            // Only front row: P2, P3, P4
            return new Set([2, 3, 4])

        default:
            // All positions for attack, freeball, etc.
            return new Set([1, 2, 3, 4, 5, 6])
    }
}

export function ActionPlayerModal({
    isOpen,
    actionType,
    currentSet,
    onCourtPlayers,
    onConfirm,
    onClose
}: ActionPlayerModalV2Props) {
    if (!isOpen) return null

    const title = getActionTitle(actionType)
    const eligiblePositions = getEligiblePositions(actionType)

    // Get eligible players based on action type
    const eligiblePlayers = onCourtPlayers.filter(p => eligiblePositions.has(p.position))

    // Get action-specific colors
    const getActionColor = () => {
        switch (actionType) {
            case 'serve_point':
            case 'attack_point':
            case 'block_point':
                return 'emerald' // Points for us
            case 'service_error':
            case 'attack_error':
            case 'attack_blocked':
            case 'unforced_error':
            case 'fault':
                return 'red' // Points for opponent
            case 'freeball':
                return 'blue'
            default:
                return 'zinc'
        }
    }

    const color = getActionColor()
    const headerColor = color === 'emerald' ? 'text-emerald-400'
        : color === 'red' ? 'text-red-400'
            : color === 'blue' ? 'text-blue-400'
                : 'text-zinc-300'

    const handlePlayerClick = (playerId: string) => {
        onConfirm(playerId)
    }

    // Helper to check if position is eligible
    const isPositionEligible = (pos: number) => eligiblePositions.has(pos)

    // Get player at position
    const getPlayerAt = (pos: number) => {
        const entry = onCourtPlayers.find(p => p.position === pos)
        return entry?.player
    }

    // Get subtitle based on action type
    const getSubtitle = () => {
        if (actionType === 'serve_point' || actionType === 'service_error') {
            return 'Sacadora (P1)'
        }
        if (actionType === 'block_point' || actionType === 'attack_blocked') {
            return 'Línea delantera (P2, P3, P4)'
        }
        return 'Selecciona la jugadora'
    }

    // Standard volleyball layout positions
    const row1Positions = [4, 3, 2] as const
    const row2Positions = [5, 6, 1] as const

    // Check if there are no eligible players
    if (eligiblePlayers.length === 0) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
                <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden p-6 text-center">
                    <h2 className={`text-lg font-bold uppercase tracking-wider ${headerColor}`}>{title}</h2>
                    <p className="text-sm text-zinc-400 mt-4">No hay jugadoras elegibles para esta acción</p>
                    <button
                        onClick={onClose}
                        className="mt-4 px-6 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-zinc-900/95 backdrop-blur border-b border-zinc-800 p-4 text-center">
                    <h2 className={`text-lg font-bold uppercase tracking-wider ${headerColor}`}>
                        {title}
                    </h2>
                    <p className="text-xs text-zinc-500 mt-1">
                        Set {currentSet} — {getSubtitle()}
                    </p>

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                        <span className="text-xl font-bold">×</span>
                    </button>
                </div>

                {/* Player Grid - 3x2 layout */}
                <div className="p-4">
                    <div className="flex flex-col gap-1">
                        {/* Row 1: P4, P3, P2 */}
                        <div className="flex justify-center gap-1">
                            {row1Positions.map(pos => {
                                const player = getPlayerAt(pos)
                                const eligible = isPositionEligible(pos)

                                if (!player) return <div key={pos} className="w-28 h-14" />

                                return (
                                    <PlayerCard
                                        key={player.id}
                                        number={player.number}
                                        name={player.name}
                                        role={player.role}
                                        position={pos}
                                        compact={true}
                                        disabled={!eligible}
                                        onClick={eligible ? () => handlePlayerClick(player.id) : undefined}
                                        className={eligible
                                            ? "cursor-pointer hover:scale-105 transition-transform"
                                            : "opacity-30 cursor-not-allowed"
                                        }
                                    />
                                )
                            })}
                        </div>

                        {/* Row 2: P5, P6, P1 */}
                        <div className="flex justify-center gap-1">
                            {row2Positions.map(pos => {
                                const player = getPlayerAt(pos)
                                const eligible = isPositionEligible(pos)

                                if (!player) return <div key={pos} className="w-28 h-14" />

                                return (
                                    <PlayerCard
                                        key={player.id}
                                        number={player.number}
                                        name={player.name}
                                        role={player.role}
                                        position={pos}
                                        compact={true}
                                        disabled={!eligible}
                                        onClick={eligible ? () => handlePlayerClick(player.id) : undefined}
                                        className={eligible
                                            ? "cursor-pointer hover:scale-105 transition-transform"
                                            : "opacity-30 cursor-not-allowed"
                                        }
                                    />
                                )
                            })}
                        </div>
                    </div>

                    {/* Hint */}
                    <p className="text-center text-[10px] text-zinc-600 mt-4 uppercase tracking-wide">
                        {eligiblePlayers.length === 1
                            ? 'Toca la jugadora para confirmar'
                            : 'Toca una jugadora para confirmar'
                        }
                    </p>
                </div>
            </div>
        </div>
    )
}
