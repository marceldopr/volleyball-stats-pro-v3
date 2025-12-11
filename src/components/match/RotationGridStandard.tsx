import { PlayerCard } from './PlayerCard'

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

        if (!player) {
            return (
                <PlayerCard
                    key={position}
                    number=""
                    name=""
                    position={position}
                    compact={compact}
                    disabled={true}
                />
            )
        }

        return (
            <PlayerCard
                key={position}
                number={player.number}
                name={player.name}
                role={player.role}
                position={position}
                isSelected={player.isSelected}
                disabled={player.disabled}
                onClick={selectable ? () => onSlotClick && onSlotClick(position, player.playerId) : undefined}
                compact={compact}
            />
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
