import { PlayerCard } from './PlayerCard'

export interface LineupPlayer {
    id: string
    number: number
    name: string
    position: string
    isLibero?: boolean
    courtPosition?: number
}

export interface LineupGridProps {
    players: (LineupPlayer | null)[]
    highlightedPlayerId?: string | null
    disabledPlayerIds?: string[]
    servingPlayerId?: string | null
    onPlayerClick?: (playerId: string, position: number) => void
    className?: string
    title?: string
    compact?: boolean
    showCourtLines?: boolean
    size?: 'large' | 'medium' | 'small'
}

export const LineupGrid = ({
    players,
    highlightedPlayerId,
    disabledPlayerIds = [],
    servingPlayerId,
    onPlayerClick,
    className = '',
    title,
    compact = false,
    showCourtLines = false,
    size = 'large'
}: LineupGridProps) => {
    // Standard volleyball positions:
    // 4 3 2 (Front Row)
    // 5 6 1 (Back Row)

    const frontRowPositions = [4, 3, 2]
    const backRowPositions = [5, 6, 1]

    const getFrontRowPlayers = () => {
        return frontRowPositions.map(pos => {
            // Map court position (1-6) to array index (0-5)
            // Assuming players array is ordered by court position 1-6
            // But commonly passed as array of 6 players where index 0 is pos 1, index 1 is pos 2, etc.
            // Let's check how it's used.
            // In LiveMatchScouting:
            // players={displayRotationOrder.map((playerId, idx) => { ... courtPosition: idx + 1 })}
            // So index 0 is pos 1, index 1 is pos 2, etc.

            // pos 4 -> index 3
            // pos 3 -> index 2
            // pos 2 -> index 1
            const index = pos - 1
            return players[index] || null
        })
    }

    const getBackRowPlayers = () => {
        return backRowPositions.map(pos => {
            // pos 5 -> index 4
            // pos 6 -> index 5
            // pos 1 -> index 0
            const index = pos - 1
            return players[index] || null
        })
    }

    const renderPlayerCard = (player: LineupPlayer | null, position: number) => {
        if (!player) {
            // Tamanys per cercles buits segons size
            const emptyCircleSize = size === 'large' ? 'w-16 h-16' : size === 'medium' ? 'w-14 h-14' : 'w-12 h-12'
            const emptyTextSize = size === 'large' ? 'text-3xl' : size === 'medium' ? 'text-2xl' : 'text-xl'
            const emptyBadgeSize = size === 'large' ? 'text-[9px]' : size === 'medium' ? 'text-[8px]' : 'text-[7px]'
            const emptyNameSize = size === 'large' ? 'text-xs' : size === 'medium' ? 'text-[11px]' : 'text-[10px]'

            // Si hi ha onPlayerClick, fer clickable
            if (onPlayerClick) {
                return (
                    <button
                        key={position}
                        onClick={() => onPlayerClick('', position)}
                        className="flex flex-col items-center cursor-pointer hover:opacity-70 transition-opacity"
                    >
                        <div className={`${emptyCircleSize} bg-gray-300 rounded-full flex items-center justify-center text-gray-500 ${emptyTextSize} font-bold shadow-lg border-2 border-dashed border-gray-400 mb-1`}>
                            +
                        </div>
                        <span className={`px-2 py-0.5 rounded-full ${emptyBadgeSize} font-bold uppercase mb-0.5 bg-gray-100 text-gray-400`}>
                            Pos. {position}
                        </span>
                        <span className={`${emptyNameSize} font-bold text-gray-400 truncate max-w-[80px]`}>
                            Seleccionar
                        </span>
                    </button>
                )
            }

            return (
                <div key={position} className="flex flex-col items-center">
                    <div className={`${emptyCircleSize} bg-gray-300 rounded-full flex items-center justify-center text-gray-500 ${emptyTextSize} font-bold shadow-lg border-2 border-white mb-1`}>
                        -
                    </div>
                    <span className={`px-2 py-0.5 rounded-full ${emptyBadgeSize} font-bold uppercase mb-0.5 bg-gray-100 text-gray-400`}>
                        -
                    </span>
                    <span className={`${emptyNameSize} font-bold text-gray-400 truncate max-w-[80px]`}>
                        -
                    </span>
                </div>
            )
        }

        return (
            <PlayerCard
                key={position}
                player={player}
                size={size}
                isSelected={highlightedPlayerId === player.id}
                isDisabled={disabledPlayerIds.includes(player.id)}
                isServing={servingPlayerId === player.id}
                onClick={onPlayerClick ? () => onPlayerClick(player.id, position) : undefined}
            />
        )
    }

    const frontRowPlayers = getFrontRowPlayers()
    const backRowPlayers = getBackRowPlayers()

    return (
        <div className={className}>
            {title && (
                <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
            )}

            <div className={`bg-white rounded-xl shadow-inner relative overflow-hidden ${size === 'small' ? 'p-2 min-h-[180px]' :
                size === 'medium' ? 'p-3 min-h-[240px]' :
                    'p-4 min-h-[300px]'
                } ${compact ? 'min-h-[200px]' : ''}`}>
                {/* Court Markings */}
                {showCourtLines && (
                    <>
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-300 w-full" /> {/* Net */}
                        <div className="absolute top-1/3 left-0 right-0 h-0.5 bg-gray-200 w-full border-t border-dashed border-gray-400" /> {/* 3m Line */}
                    </>
                )}

                {/* Players Container */}
                <div className={`relative h-full flex flex-col justify-between ${size === 'small' ? 'py-2' :
                    size === 'medium' ? 'py-3' :
                        'py-4'
                    }`}>
                    {/* Front Row */}
                    <div className={`grid grid-cols-3 ${size === 'small' ? 'gap-2' :
                        size === 'medium' ? 'gap-3' :
                            'gap-4'
                        }`}>
                        {frontRowPlayers.map((player, index) => {
                            const position = frontRowPositions[index]
                            return renderPlayerCard(player, position)
                        })}
                    </div>

                    {/* Back Row */}
                    <div className={`grid grid-cols-3 ${size === 'small' ? 'gap-2 mt-2' :
                        size === 'medium' ? 'gap-3 mt-4' :
                            'gap-4 mt-8'
                        } ${compact ? 'mt-4' : ''}`}>
                        {backRowPlayers.map((player, index) => {
                            const position = backRowPositions[index]
                            return renderPlayerCard(player, position)
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
