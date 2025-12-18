import { RotationGridStandard, type RotationSlotPlayer } from './RotationGridStandard'

interface RotationModalV2Props {
    isOpen: boolean
    onClose: () => void
    onCourtPlayers: Array<{ position: number; player: { id: string; name: string; number: number } }>
    getPlayerDisplay: (playerId: string | null | undefined) => {
        number: string
        name: string
        role: string
    }
}

export function RotationModalV2({
    isOpen,
    onClose,
    onCourtPlayers,
    getPlayerDisplay
}: RotationModalV2Props) {
    if (!isOpen) return null

    // Helper to get player at a position
    const getPlayerAt = (pos: number) => {
        const entry = onCourtPlayers.find(e => e.position === pos)
        return entry?.player || null
    }

    // Prepare players for RotationGridStandard
    const gridPlayers: RotationSlotPlayer[] = [1, 2, 3, 4, 5, 6].map(pos => {
        const player = getPlayerAt(pos)
        const display = getPlayerDisplay(player?.id)

        return {
            position: pos as 1 | 2 | 3 | 4 | 5 | 6,
            playerId: player?.id || null,
            number: display.number,
            name: display.name,
            role: display.role
        }
    })

    return (
        <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center animate-in fade-in duration-100"
            onClick={onClose}
        >
            <div
                className="bg-zinc-900 w-full max-w-md rounded-xl border border-zinc-800 p-6 shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="text-center mb-6">
                    <h3 className="text-white font-bold text-lg uppercase tracking-widest">Rotación Actual</h3>
                    <p className="text-zinc-500 text-xs mt-1">Saca: P1</p>
                </div>

                <RotationGridStandard
                    players={gridPlayers}
                    compact={false}
                    className="mb-6"
                />

                <button onClick={onClose} className="w-full py-3 bg-zinc-800 text-white font-bold rounded-lg active:bg-zinc-700">
                    CERRAR
                </button>
            </div>
        </div>
    )
}
