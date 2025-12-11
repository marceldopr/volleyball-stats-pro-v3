interface RotationSlotPlayer {
    position: 1 | 2 | 3 | 4 | 5 | 6
    number: string
    name: string
    role: string
    playerId: string | null
    isSelected?: boolean
    disabled?: boolean
}

interface RotationGridStandardProps {
    players: RotationSlotPlayer[]  // Array de 6 jugadoras (P1-P6)
    onSlotClick?: (position: 1 | 2 | 3 | 4 | 5 | 6, playerId: string | null) => void
    selectable?: boolean           // Si true, aplica hover/click states
    compact?: boolean              // Para ajustar altura (h-12 vs h-14)
    className?: string             // Clase adicional para contenedor
}

export function RotationGridStandard({
    players,
    onSlotClick,
    selectable = false,
    compact = true,
    className = ''
}: RotationGridStandardProps) {
    const renderSlot = (position: 1 | 2 | 3 | 4 | 5 | 6) => {
        const player = players.find(p => p.position === position)

        // Clases base unificadas - mismo tamaño para inline y modal
        // Clases base unificadas - mismo tamaño para inline y modal (w-28 = 112px fixed)
        const baseClasses = `w-28 ${compact ? 'h-12' : 'h-14'} rounded border-2 flex flex-col items-center justify-center shadow-sm relative overflow-visible`

        if (!player) {
            // Empty slot
            return (
                <div
                    key={position}
                    className={`${baseClasses} bg-zinc-900/50 border-zinc-800/50`}
                >
                    <div className="absolute top-0.5 left-1 opacity-80">
                        <span className="text-[9px] font-bold text-zinc-600">P{position}</span>
                    </div>
                    <span className="text-zinc-700">-</span>
                </div>
            )
        }

        const isSelected = player.isSelected || false
        const isDisabled = player.disabled || false
        const isClickable = selectable && !isDisabled && onSlotClick

        const stateClasses = isSelected
            ? 'bg-emerald-600/90 border-emerald-400 scale-105'
            : isDisabled
                ? 'bg-zinc-900/50 border-zinc-800/50 opacity-50 cursor-not-allowed'
                : 'bg-zinc-800/80 border-zinc-700/50'

        const hoverClasses = isClickable && !isSelected && !isDisabled
            ? 'hover:border-zinc-600 hover:bg-zinc-800 cursor-pointer'
            : ''

        const Element = isClickable ? 'button' : 'div'

        return (
            <Element
                key={position}
                onClick={() => isClickable && onSlotClick(position, player.playerId)}
                disabled={isDisabled}
                className={`${baseClasses} ${stateClasses} ${hoverClasses} transition-all`}
            >
                {/* Pn en esquina superior izquierda */}
                <div className="absolute top-0.5 left-1 opacity-80">
                    <span className="text-[9px] font-bold text-white">P{position}</span>
                </div>

                {/* Rol en esquina superior derecha */}
                {player.role && player.role.toLowerCase() !== 'starter' && (
                    <div className="absolute top-0.5 right-1">
                        <span className="text-[8px] font-bold text-zinc-400 bg-zinc-900/50 px-1 rounded leading-none">
                            {player.role}
                        </span>
                    </div>
                )}

                {/* Dorsal grande en centro */}
                <span className={`text-xl font-bold z-10 leading-none mb-0.5 mt-2 ${isSelected ? 'text-white' : 'text-zinc-200'
                    }`}>
                    {player.number}
                </span>

                {/* Nombre pequeño debajo */}
                <span className={`text-[10px] uppercase z-10 leading-none truncate w-full text-center px-0.5 ${isSelected ? 'text-emerald-100' : 'text-zinc-400'
                    }`}>
                    {player.name}
                </span>
            </Element>
        )
    }

    // Clases de filas - IDÉNTICAS para inline y modal
    const row1Classes = "flex justify-center gap-1 w-full border-b border-zinc-800/50 pb-1"
    const row2Classes = "flex justify-center gap-1 w-full pt-1"

    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            {/* Fila 1: P4 - P3 - P2 */}
            <div className={row1Classes}>
                {renderSlot(4)}
                {renderSlot(3)}
                {renderSlot(2)}
            </div>

            {/* Fila 2: P5 - P6 - P1 */}
            <div className={row2Classes}>
                {renderSlot(5)}
                {renderSlot(6)}
                {renderSlot(1)}
            </div>
        </div>
    )
}

// Export types for external use
export type { RotationSlotPlayer, RotationGridStandardProps }
