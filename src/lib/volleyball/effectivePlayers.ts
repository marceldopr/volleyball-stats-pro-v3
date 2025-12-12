/**
 * Effective On-Court Players Helper
 * 
 * Returns the REAL 6 players on court with libero substitutions already applied.
 * This is the SINGLE SOURCE OF TRUTH for "who is actually on court right now".
 */

import { PlayerV2 } from '@/stores/matchStoreV2'
import { calculateLiberoRotation } from './liberoLogic'

export interface OnCourtPlayer {
    position: 1 | 2 | 3 | 4 | 5 | 6
    player: PlayerV2
}

/**
 * Returns the effective on-court players with libero logic applied.
 * 
 * @param onCourtPlayers - Base rotation from derivedState (6 starters)
 * @param currentLiberoId - Active libero ID (or null)
 * @param isServing - Whether our team is currently serving
 * @param availablePlayers - Full list of available players to find libero data
 * @returns Array of exactly 6 players representing who is ACTUALLY on court
 */
export function getEffectiveOnCourtPlayers(
    onCourtPlayers: OnCourtPlayer[],
    currentLiberoId: string | null,
    isServing: boolean,
    availablePlayers: PlayerV2[]
): OnCourtPlayer[] {
    // If no libero or no players, return as-is
    if (!currentLiberoId || onCourtPlayers.length === 0) {
        return onCourtPlayers
    }

    // Build base rotation IDs array (index 0 = P1, index 5 = P6)
    const baseRotationIds: (string | null)[] = []
    for (let pos = 1; pos <= 6; pos++) {
        const entry = onCourtPlayers.find(p => p.position === pos)
        baseRotationIds.push(entry?.player.id || null)
    }

    // Helper to get player role
    const getPlayerRole = (id: string): string | undefined => {
        const player = availablePlayers.find(p => p.id === id)
        return player?.role
    }

    // Apply libero logic
    const effectiveIds = calculateLiberoRotation(
        baseRotationIds,
        currentLiberoId,
        isServing,
        getPlayerRole
    )

    // Build result array with player objects
    const result: OnCourtPlayer[] = []

    for (let i = 0; i < 6; i++) {
        const playerId = effectiveIds[i]
        const position = (i + 1) as 1 | 2 | 3 | 4 | 5 | 6

        if (playerId) {
            // Find the player object
            const player = availablePlayers.find(p => p.id === playerId)
            if (player) {
                result.push({ position, player })
            }
        }
    }

    return result
}
