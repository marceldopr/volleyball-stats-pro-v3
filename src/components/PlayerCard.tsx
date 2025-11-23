import React from 'react'

/**
 * Unified player card component used across the app.
 * Modern card design with white background, shadow, and floating effect.
 */
export interface PlayerInfo {
    id: string
    number: number
    name: string
    position: string // short code: 'S', 'OH', 'MB', 'OPP', 'L'
    isLibero?: boolean
}

export interface PlayerCardProps {
    player: PlayerInfo
    size: 'large' | 'medium' | 'small'
    isSelected?: boolean
    isDisabled?: boolean
    isHighlighted?: boolean
    isServing?: boolean
    onClick?: () => void
}

// Size mapping for card, circle dimensions and font sizes
const sizeMap = {
    large: {
        card: 'p-2.5',
        circle: 'w-16 h-16',
        number: 'text-3xl',
        badge: 'text-[9px] px-1.5 py-0.5',
        name: 'text-xs mt-1.5'
    },
    medium: {
        card: 'p-2',
        circle: 'w-14 h-14',
        number: 'text-2xl',
        badge: 'text-[8px] px-1.5 py-0.5',
        name: 'text-[11px] mt-1.5'
    },
    small: {
        card: 'p-1.5',
        circle: 'w-12 h-12',
        number: 'text-xl',
        badge: 'text-[7px] px-1 py-0.5',
        name: 'text-[10px] mt-1'
    },
}

const positionBadgeClass = (position: string) => {
    if (position === 'L') return 'bg-yellow-500 text-black'
    if (position === 'S') return 'bg-blue-500 text-white'
    if (position === 'OH') return 'bg-green-500 text-white'
    if (position === 'MB') return 'bg-purple-500 text-white'
    if (position === 'OPP') return 'bg-orange-500 text-white'
    return 'bg-gray-500 text-white'
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
    player,
    size,
    isSelected = false,
    isDisabled = false,
    isHighlighted = false,
    isServing = false,
    onClick,
}) => {
    const { card, circle, number, badge, name } = sizeMap[size]
    const wrapperTag = onClick && !isDisabled ? 'button' : 'div'
    const wrapperProps = onClick && !isDisabled ? { onClick } : {}

    // Card styling
    const cardBaseClass = 'bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200'
    const selectedClass = isSelected ? 'ring-4 ring-blue-400 shadow-xl' : ''
    const disabledClass = isDisabled ? 'opacity-40 pointer-events-none' : 'hover:scale-105 cursor-pointer'
    const highlightClass = isHighlighted ? 'scale-105 shadow-xl' : ''

    return React.createElement(
        wrapperTag,
        {
            ...wrapperProps,
            className: `${cardBaseClass} ${card} ${selectedClass} ${disabledClass} ${highlightClass} flex flex-col items-center`
        },
        <>
            {/* Circle with number and position badge */}
            <div className={`${circle} bg-black rounded-full flex items-center justify-center text-white ${number} font-bold shadow-lg relative`}>
                {player.number}

                {/* Position badge - inside circle at bottom-right */}
                <div className={`absolute -bottom-0.5 -right-0.5 ${badge} ${positionBadgeClass(player.position)} rounded-full font-bold uppercase shadow-md flex items-center justify-center aspect-square min-w-[18px] min-h-[18px]`}>
                    {player.position}
                </div>

                {/* Serving indicator - top-right */}
                {isServing && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center ring-2 ring-white text-[10px] shadow-md">
                        🏐
                    </div>
                )}
            </div>

            {/* Player full name - uppercase, semibold */}
            <span className={`${name} text-gray-900 font-semibold uppercase text-center leading-tight max-w-full px-1`}>
                {player.name}
            </span>
        </>
    )
}
