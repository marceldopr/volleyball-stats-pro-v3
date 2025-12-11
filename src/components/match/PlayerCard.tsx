
interface PlayerCardProps {
    number: string | number
    name: string
    role?: string
    position?: 1 | 2 | 3 | 4 | 5 | 6
    isSelected?: boolean
    disabled?: boolean
    onClick?: () => void
    compact?: boolean // default true
    className?: string
}

export function PlayerCard({
    number,
    name,
    role,
    position,
    isSelected = false,
    disabled = false,
    onClick,
    compact = true,
    className = ''
}: PlayerCardProps) {

    // Same base classes as RotationGridStandard (w-28 fixed width)
    const baseClasses = `w-28 ${compact ? 'h-12' : 'h-14'} rounded border-2 flex flex-col items-center justify-center shadow-sm relative overflow-visible`

    // Empty/Placeholder case
    if (!number && !name) {
        return (
            <div className={`${baseClasses} bg-zinc-900/50 border-zinc-800/50 ${className}`}>
                {position && (
                    <div className="absolute top-0.5 left-1 opacity-80">
                        <span className="text-[9px] font-bold text-zinc-600">P{position}</span>
                    </div>
                )}
                <span className="text-zinc-700">-</span>
            </div>
        )
    }

    const isClickable = !disabled && !!onClick

    const stateClasses = isSelected
        ? 'bg-emerald-600/90 border-emerald-400 scale-105'
        : disabled
            ? 'bg-zinc-900/50 border-zinc-800/50 opacity-50 cursor-not-allowed'
            : 'bg-zinc-800/80 border-zinc-700/50'

    const hoverClasses = isClickable && !isSelected && !disabled
        ? 'hover:border-zinc-600 hover:bg-zinc-800 cursor-pointer'
        : ''

    const Element = isClickable ? 'button' : 'div'

    return (
        <Element
            onClick={isClickable ? onClick : undefined}
            disabled={disabled}
            className={`${baseClasses} ${stateClasses} ${hoverClasses} transition-all ${className}`}
        >
            {/* Pn Badge (optional usually for rotation) */}
            {position && (
                <div className="absolute top-0.5 left-1 opacity-80">
                    <span className="text-[9px] font-bold text-white">P{position}</span>
                </div>
            )}

            {/* Role Badge (top right) */}
            {role && role.toLowerCase() !== 'starter' && (
                <div className="absolute top-0.5 right-1">
                    <span className="text-[8px] font-bold text-zinc-400 bg-zinc-900/50 px-1 rounded leading-none">
                        {role}
                    </span>
                </div>
            )}

            {/* Number (Center) */}
            <span className={`text-xl font-bold z-10 leading-none mb-0.5 mt-2 ${isSelected ? 'text-white' : 'text-zinc-200'
                }`}>
                {number}
            </span>

            {/* Name (Bottom) */}
            <span className={`text-[10px] uppercase z-10 leading-none truncate w-full text-center px-0.5 ${isSelected ? 'text-emerald-100' : 'text-zinc-400'
                }`}>
                {name}
            </span>
        </Element>
    )
}
