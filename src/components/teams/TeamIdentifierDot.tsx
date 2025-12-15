/**
 * TeamIdentifierDot - Visual color indicator for team identifier
 * 
 * Shows a small colored dot when the team has a color-type identifier.
 * Does not show anything for letter-type identifiers or when no identifier exists.
 */

interface TeamIdentifierDotProps {
    identifier?: {
        name: string
        type: 'letter' | 'color'
        color_hex: string | null
    } | null
    size?: 'sm' | 'md'
    className?: string
}

export function TeamIdentifierDot({ identifier, size = 'md', className = '' }: TeamIdentifierDotProps) {
    // Only show for color-type identifiers with a valid color
    if (!identifier || identifier.type !== 'color' || !identifier.color_hex) {
        return null
    }

    const sizeClasses = {
        sm: 'w-2 h-2',
        md: 'w-3 h-3'
    }

    return (
        <span
            className={`inline-block rounded-full ring-1 ring-white/20 flex-shrink-0 ${sizeClasses[size]} ${className}`}
            style={{ backgroundColor: identifier.color_hex }}
            title={`Identificador: ${identifier.name}`}
            aria-label={`Identificador de color: ${identifier.name}`}
        />
    )
}
