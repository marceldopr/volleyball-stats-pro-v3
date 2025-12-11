import { calculateLiberoRotation } from '@/lib/volleyball/liberoLogic'
import type { PlayerV2 } from '@/stores/matchStoreV2'
import { RotationGridStandard, type RotationSlotPlayer } from './RotationGridStandard'

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

    // 3. Prepare players for RotationGridStandard
    const gridPlayers: RotationSlotPlayer[] = [1, 2, 3, 4, 5, 6].map(pos => {
        const playerId = displayRotationIds[pos - 1]; // Array is 0-based, positions are 1-based
        const display = getPlayerDisplay(playerId);

        return {
            position: pos as 1 | 2 | 3 | 4 | 5 | 6,
            playerId,
            number: display.number,
            name: display.name,
            role: display.role
        };
    });

    return (
        <div
            className="mt-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-2 flex flex-col gap-1 items-center cursor-pointer hover:bg-zinc-800/50 transition-colors"
            onClick={onClick}
        >
            <RotationGridStandard
                players={gridPlayers}
                compact={false}
            />
        </div>
    )
}
