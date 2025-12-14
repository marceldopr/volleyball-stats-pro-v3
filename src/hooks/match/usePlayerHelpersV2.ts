import { useMemo } from 'react'
import type { DerivedMatchState, PlayerV2 } from '@/stores/matchStoreV2'
import { getEffectiveOnCourtPlayers } from '@/lib/volleyball/effectivePlayers'

export interface UsePlayerHelpersV2Args {
    availablePlayers: PlayerV2[]
    derivedState: DerivedMatchState
    isServing: boolean
}

export interface UsePlayerHelpersV2Return {
    getPlayerDisplay: (playerId: string | null | undefined) => {
        number: string
        name: string
        role: string
    }
    effectiveOnCourtPlayers: any[] // Type from getEffectiveOnCourtPlayers
    benchPlayers: PlayerV2[]
    getPlayerAt: (position: number) => PlayerV2 | undefined
}

/**
 * Player helpers hook
 * Provides utility functions and computed values for player display and management
 */
export function usePlayerHelpersV2({
    availablePlayers,
    derivedState,
    isServing
}: UsePlayerHelpersV2Args): UsePlayerHelpersV2Return {

    // Helper to get player display info (used by modals and rotation views)
    const getPlayerDisplay = (playerId: string | null | undefined): { number: string; name: string; role: string } => {
        if (!playerId) {
            return { number: '?', name: '-', role: '' }
        }
        const player = availablePlayers.find(p => p.id === playerId)
        if (!player) {
            return { number: '?', name: '-', role: '' }
        }
        return {
            number: String(player.number),
            name: player.name,
            role: player.role || ''
        }
    }

    // EFFECTIVE on-court players with libero logic applied
    // This is the SINGLE SOURCE OF TRUTH for who is actually on court
    const effectiveOnCourtPlayers = useMemo(() =>
        getEffectiveOnCourtPlayers(
            derivedState.onCourtPlayers,
            derivedState.currentLiberoId,
            isServing,
            availablePlayers
        ),
        [derivedState.onCourtPlayers, derivedState.currentLiberoId, isServing, availablePlayers]
    )

    // Compute bench players for substitution modal
    // CRITICAL: Uses BASE rotation (onCourtPlayers), NOT effective rotation
    // This ensures consistency with SubstitutionModalV2 which shows base rotation
    const benchPlayers = useMemo(() =>
        availablePlayers.filter(p => {
            const isOnCourt = derivedState.onCourtPlayers.some(entry => entry.player.id === p.id)
            return !isOnCourt
        }),
        [availablePlayers, derivedState.onCourtPlayers]
    )

    // Helper function to get player at specific position
    const getPlayerAt = (position: number) => {
        return derivedState.onCourtPlayers.find(entry => entry.position === position)?.player
    }

    return {
        getPlayerDisplay,
        effectiveOnCourtPlayers,
        benchPlayers,
        getPlayerAt
    }
}
