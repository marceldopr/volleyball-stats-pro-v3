import { calculateLiberoRotation } from '@/lib/volleyball/liberoLogic'
import type { PlayerV2 } from '@/stores/matchStoreV2'

interface RotationDisplayProps {
    onCourtPlayers: { position: 1 | 2 | 3 | 4 | 5 | 6; player: PlayerV2 }[]
    currentLiberoId: string | null
    servingSide: 'our' | 'opponent'
    availablePlayers: PlayerV2[]
    getPlayerDisplay: (playerId: string | null | undefined) => { number: string; name: string; role: string }
    onClick: () => void
}

export function RotationDisplay({
    onCourtPlayers,
    currentLiberoId,
    servingSide,
    availablePlayers,
    getPlayerDisplay,
    onClick
}: RotationDisplayProps) {
    // Helper to get player at specific position
    const getPlayerAt = (position: number) => {
        return onCourtPlayers.find(entry => entry.position === position)?.player
    }

    // 1. Prepare base rotation array P1-P6 from state
    const currentRotationPlayers = [1, 2, 3, 4, 5, 6].map(pos => getPlayerAt(pos));
    const baseRotationIds = currentRotationPlayers.map(p => p?.id || null);

    // 2. Calculate display rotation (with libero swap)
    const isServing = servingSide === 'our';
    const displayRotationIds = calculateLiberoRotation(
        baseRotationIds,
        currentLiberoId,
        isServing,
        (id) => availablePlayers.find(p => p.id === id)?.role
    );

    // Helper to render a position box
    const renderPositionBox = (posIndex: number, originalPosLabel: number) => {
        const playerId = displayRotationIds[posIndex]; // 0-based index from calc function
        const display = getPlayerDisplay(playerId);

        // Determine actual P-label to show (logical position on court)
        // The array from calculateLiberoRotation is [P1, P2, P3, P4, P5, P6] (indices 0-5)
        // So index 0 is P1, index 1 is P2...

        return (
            <div key={originalPosLabel} className="flex-1 h-14 bg-zinc-800/80 rounded border border-zinc-700/50 flex flex-col items-center justify-center shadow-sm relative overflow-visible">
                <div className="absolute top-0.5 left-1 opacity-80">
                    <span className="text-[9px] font-bold text-white">P{originalPosLabel}</span>
                </div>
                {display.role && display.role.toLowerCase() !== 'starter' && (
                    <div className="absolute top-0.5 right-1">
                        <span className="text-[8px] font-bold text-zinc-400 bg-zinc-900/50 px-1 rounded leading-none">{display.role}</span>
                    </div>
                )}

                <span className="text-xl font-bold text-zinc-200 z-10 leading-none mb-0.5 mt-2">{display.number}</span>
                <span className="text-[10px] text-zinc-400 uppercase z-10 leading-none truncate w-full text-center px-0.5">{display.name}</span>
            </div>
        );
    };

    return (
        <div
            className="mt-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-2 flex flex-col gap-1 items-center cursor-pointer hover:bg-zinc-800/50 transition-colors"
            onClick={onClick}
        >
            <div className="flex justify-center gap-1 w-full border-b border-zinc-800/50 pb-1">
                {/* Front Row: P4 (index 3), P3 (index 2), P2 (index 1) */}
                {renderPositionBox(3, 4)}
                {renderPositionBox(2, 3)}
                {renderPositionBox(1, 2)}
            </div>
            <div className="flex justify-center gap-1 w-full pt-1">
                {/* Back Row: P5 (index 4), P6 (index 5), P1 (index 0) */}
                {renderPositionBox(4, 5)}
                {renderPositionBox(5, 6)}
                {renderPositionBox(0, 1)}
            </div>
        </div>
    )
}
