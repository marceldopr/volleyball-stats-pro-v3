/**
 * prepareReceptionModalRotation.ts
 * 
 * Pure helper to prepare the rotation data for ReceptionModal,
 * applying libero swap logic to show the actual on-court players.
 */

import { calculateLiberoRotation } from './liberoLogic'

export interface RotationEntry {
    position: number
    player: {
        id: string
        name: string
        number: number
        role: string
        firstName?: string
        lastName?: string
    }
}

/**
 * Prepares the rotation array for ReceptionModal with libero swap applied
 * 
 * @param onCourtPlayers - Current on-court players from derivedState
 * @param currentLiberoId - Current active libero ID (or null)
 * @param isServing - Whether our team is serving
 * @param availablePlayers - All available players with full data
 * @returns Array of rotation entries ready for ReceptionModal
 */
export function prepareReceptionModalRotation(
    onCourtPlayers: Array<{ position: number; player: { id: string; role?: string } }>,
    currentLiberoId: string | null,
    isServing: boolean,
    availablePlayers: Array<{ id: string; name: string; number: number | string; role?: string; firstName?: string; lastName?: string }>
): RotationEntry[] {
    // Get base rotation IDs from positions 1-6
    const baseRotationIds = [1, 2, 3, 4, 5, 6].map(pos => {
        const playerEntry = onCourtPlayers.find(p => p.position === pos)
        return playerEntry?.player.id || null
    })

    // Apply libero rotation logic
    const displayRotationIds = calculateLiberoRotation(
        baseRotationIds,
        currentLiberoId,
        isServing,
        (id) => availablePlayers.find(p => p.id === id)?.role
    )

    // Convert IDs array into rotation format with player objects
    const rotation: RotationEntry[] = []

    for (let idx = 0; idx < 6; idx++) {
        const pos = idx + 1
        const playerId = displayRotationIds[idx]
        const player = availablePlayers.find(p => p.id === playerId)

        if (player) {
            rotation.push({
                position: pos,
                player: {
                    id: player.id,
                    name: player.name,
                    number: typeof player.number === 'string' ? parseInt(player.number) || 0 : player.number,
                    role: player.role || '',
                    firstName: player.firstName,
                    lastName: player.lastName
                }
            })
        }
    }

    return rotation
}
