import { formatPlayerName } from '@/utils/playerDisplay'
import type { PlayerV2 } from '@/stores/matchStore'

interface PlayerCardProps {
    number: string | number
    name: string
    player?: PlayerV2 | null // Optional full player object for better name formatting
    role?: string
    position?: 1 | 2 | 3 | 4 | 5 | 6
    isSelected?: boolean
    disabled?: boolean
    onClick?: () => void
    compact?: boolean // default true
    className?: string
}

// Helper function for role circle colors - elegant dark theme
function getRoleCircleClasses(role: string): string {
    switch (role.toUpperCase()) {
        case 'S':
            return 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
        case 'OPP':
            return 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40'
        case 'OH':
            return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
        case 'MB':
            return 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
        case 'L':
            return 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
        default:
            return 'bg-zinc-700/40 text-zinc-300 border border-zinc-600/60'
    }
}

export function PlayerCard({
    number,
    name,
    player,
    role,
    position,
    isSelected = false,
    disabled = false,
    onClick,
    compact = true,
    className = ''
}: PlayerCardProps) {

    const isEmpty = !number && !name
    const isClickable = !disabled && !!onClick

    // Base dimensions - w-28 = 112px, centered content
    const baseClasses = `w-28 ${compact ? 'h-14' : 'h-16'} rounded-lg border flex flex-col items-center justify-center px-1 py-1 relative overflow-visible transition-all`

    // Empty slot styling
    if (isEmpty) {
        return (
            <div className={`${baseClasses} bg-zinc-900/30 border-dashed border-zinc-700/50 ${className}`}>
                {/* Position label top-left - absolute */}
                {position && (
                    <span className="absolute top-1 left-1.5 text-[9px] font-semibold text-zinc-600">
                        P{position}
                    </span>
                )}

                {/* Plus sign centered */}
                <span className="text-2xl font-semibold text-zinc-600">+</span>

                {/* Empty text at bottom */}
                <span className="absolute bottom-1 text-[8px] text-zinc-600 uppercase">
                    Vacío
                </span>
            </div>
        )
    }

    // State-based styling
    const stateClasses = isSelected
        ? 'bg-emerald-600/90 border-emerald-400 scale-[1.02] shadow-lg shadow-emerald-500/20'
        : disabled
            ? 'bg-zinc-900/40 border-zinc-800/50 opacity-40'
            : 'bg-zinc-900/70 border-zinc-700/60'

    const hoverClasses = isClickable && !isSelected && !disabled
        ? 'hover:border-emerald-400/60 hover:bg-zinc-800/80 cursor-pointer'
        : disabled
            ? 'cursor-not-allowed'
            : ''

    const Element = isClickable ? 'button' : 'div'

    return (
        <Element
            onClick={isClickable ? onClick : undefined}
            disabled={disabled}
            className={`${baseClasses} ${stateClasses} ${hoverClasses} ${className}`}
        >
            {/* Position label P1-P6 - absolute top left */}
            {position && (
                <span className={`absolute top-1 left-1.5 text-[9px] font-semibold ${isSelected ? 'text-emerald-100' : 'text-zinc-500'}`}>
                    P{position}
                </span>
            )}

            {/* Role Circle - absolute top right (lowered slightly) */}
            {role && role.toLowerCase() !== 'starter' && (
                <span className={`absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold ${getRoleCircleClasses(role)}`}>
                    {role.length > 2 ? role.substring(0, 2) : role}
                </span>
            )}

            {/* Number - CENTERED and PROMINENT */}
            <span className={`text-[26px] font-bold leading-none ${isSelected ? 'text-white' : 'text-zinc-100'}`}>
                {number}
            </span>

            {/* Name - using shared formatter */}
            <span className={`absolute bottom-1 text-[9px] uppercase tracking-wide max-w-[100px] text-center leading-tight line-clamp-1 ${isSelected ? 'text-emerald-100' : 'text-zinc-400'}`}>
                {formatPlayerName(player, name)}
            </span>
        </Element>
    )
}
