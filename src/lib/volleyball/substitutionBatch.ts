/**
 * Batch Substitution Helpers
 * Pure functions for simulating and validating batch substitutions
 * without mutating store state.
 */

import { PlayerV2 } from '@/stores/matchStoreV2'

// --- Types ---

export interface OnCourtPlayer {
    position: 1 | 2 | 3 | 4 | 5 | 6
    player: PlayerV2
}

export interface SubstitutionPair {
    starterId: string
    substituteId: string
    usesCount: number
}

export interface SetSubstitutionState {
    setNumber: number
    totalSubstitutions: number
    pairs: SubstitutionPair[]
}

export interface PlannedSub {
    outPlayerId: string
    inPlayerId: string
    outPosition: 1 | 2 | 3 | 4 | 5 | 6
    outPlayer: PlayerV2
    inPlayer: PlayerV2
}

export interface SimulatedSubState {
    onCourtPlayers: OnCourtPlayer[]
    currentSetSubstitutions: SetSubstitutionState
    totalWithPlanned: number
}

// --- Simulation ---

/**
 * Simulates the state after applying planned substitutions sequentially.
 * PURE function - does NOT mutate any input.
 */
export function simulatePlannedSubstitutions(
    baseOnCourt: OnCourtPlayer[],
    baseSetSubs: SetSubstitutionState,
    planned: PlannedSub[]
): SimulatedSubState {
    // Deep clone base state
    let simOnCourt: OnCourtPlayer[] = baseOnCourt.map(p => ({
        position: p.position,
        player: { ...p.player }
    }))

    let simPairs: SubstitutionPair[] = baseSetSubs.pairs.map(p => ({ ...p }))
    let simTotal = baseSetSubs.totalSubstitutions

    // Apply each planned substitution
    for (const sub of planned) {
        // 1. Update on-court players
        simOnCourt = simOnCourt.map(entry => {
            if (entry.player.id === sub.outPlayerId && entry.position === sub.outPosition) {
                return {
                    position: entry.position,
                    player: { ...sub.inPlayer }
                }
            }
            return entry
        })

        // 2. Update pairs (same logic as calculateDerivedState)
        const id1 = sub.outPlayerId
        const id2 = sub.inPlayerId
        const normalizedStarterId = id1 < id2 ? id1 : id2
        const normalizedSubstituteId = id1 < id2 ? id2 : id1

        const existingPairIndex = simPairs.findIndex(
            p => p.starterId === normalizedStarterId && p.substituteId === normalizedSubstituteId
        )

        if (existingPairIndex >= 0) {
            // Increment uses
            simPairs[existingPairIndex] = {
                ...simPairs[existingPairIndex],
                usesCount: simPairs[existingPairIndex].usesCount + 1
            }
        } else {
            // New pair
            simPairs.push({
                starterId: normalizedStarterId,
                substituteId: normalizedSubstituteId,
                usesCount: 1
            })
        }

        simTotal++
    }

    return {
        onCourtPlayers: simOnCourt,
        currentSetSubstitutions: {
            setNumber: baseSetSubs.setNumber,
            totalSubstitutions: simTotal,
            pairs: simPairs
        },
        totalWithPlanned: simTotal
    }
}

// --- Validation ---

/**
 * Checks if a player is already in the planned batch (as OUT or IN)
 */
export function isPlayerInBatch(planned: PlannedSub[], playerId: string): boolean {
    return planned.some(s => s.outPlayerId === playerId || s.inPlayerId === playerId)
}

/**
 * Validates if a new substitution can be added to the batch.
 * Checks batch-specific rules and FIVB rules against simulated state.
 */
export function canAddToBatch(
    planned: PlannedSub[],
    newOutId: string,
    newInId: string,
    simulatedState: SimulatedSubState
): { valid: boolean; reason?: string } {
    // 1. Check batch limit (max 6 per set)
    if (simulatedState.totalWithPlanned >= 6) {
        return {
            valid: false,
            reason: 'Límite de 6 sustituciones por set alcanzado'
        }
    }

    // 2. Check player not already in batch
    if (isPlayerInBatch(planned, newOutId)) {
        return {
            valid: false,
            reason: 'Esta jugadora ya está en la lista de cambios planificados'
        }
    }

    if (isPlayerInBatch(planned, newInId)) {
        return {
            valid: false,
            reason: 'Esta jugadora ya está en la lista de cambios planificados'
        }
    }

    // 3. Verify OUT is on court (in simulated state)
    const isOutOnCourt = simulatedState.onCourtPlayers.some(p => p.player.id === newOutId)
    if (!isOutOnCourt) {
        return {
            valid: false,
            reason: 'La jugadora que sale no está en pista'
        }
    }

    // 4. Verify IN is NOT on court (in simulated state)
    const isInOnCourt = simulatedState.onCourtPlayers.some(p => p.player.id === newInId)
    if (isInOnCourt) {
        return {
            valid: false,
            reason: 'La jugadora que entra ya está en pista'
        }
    }

    // 5. FIVB pair validation
    const simSubs = simulatedState.currentSetSubstitutions
    const pairWithOut = simSubs.pairs.find(
        p => p.starterId === newOutId || p.substituteId === newOutId
    )
    const pairWithIn = simSubs.pairs.find(
        p => p.starterId === newInId || p.substituteId === newInId
    )

    // Case 1: Neither has a pair -> valid (new pair will be created)
    if (!pairWithOut && !pairWithIn) {
        return { valid: true }
    }

    // Case 2: Both already have a pair
    if (pairWithOut && pairWithIn) {
        // Only valid if they're the same pair
        const isSamePair =
            pairWithOut.starterId === pairWithIn.starterId &&
            pairWithOut.substituteId === pairWithIn.substituteId

        if (!isSamePair) {
            return {
                valid: false,
                reason: 'Estas jugadoras ya están emparejadas con otras'
            }
        }

        const pair = pairWithOut
        if (pair.usesCount >= 2) {
            return {
                valid: false,
                reason: 'Esta pareja ya ha agotado sus cambios (máx 2 por set)'
            }
        }

        // Verify correct direction
        const validDirection =
            (pair.substituteId === newOutId && pair.starterId === newInId) ||
            (pair.starterId === newOutId && pair.substituteId === newInId)

        if (!validDirection) {
            return {
                valid: false,
                reason: 'Dirección de cambio incorrecta para esta pareja'
            }
        }

        return { valid: true }
    }

    // Case 3: Only one has a pair -> invalid
    if (pairWithOut || pairWithIn) {
        return {
            valid: false,
            reason: 'Una de las jugadoras ya tiene pareja asignada'
        }
    }

    return { valid: true }
}

/**
 * Check if a player is available for selection in batch mode
 * Takes into account both base pairs AND planned substitutions
 */
export function isPlayerAvailableInBatch(
    playerId: string,
    planned: PlannedSub[],
    simulatedState: SimulatedSubState,
    playerOut: { id: string } | null
): boolean {
    // If player is already in the planned batch, not available
    if (isPlayerInBatch(planned, playerId)) {
        return false
    }

    // Check against simulated pairs
    const pair = simulatedState.currentSetSubstitutions.pairs.find(
        p => p.starterId === playerId || p.substituteId === playerId
    )

    // No pair -> available
    if (!pair) return true

    // Pair exhausted (2/2) -> not available
    if (pair.usesCount >= 2) return false

    // Active pair (1/2): only available if is partner of playerOut
    if (pair.usesCount === 1) {
        if (playerOut) {
            const isPartner =
                (pair.starterId === playerOut.id && pair.substituteId === playerId) ||
                (pair.substituteId === playerOut.id && pair.starterId === playerId)
            return isPartner
        }
        // No playerOut selected -> not available (must select partner first)
        return false
    }

    return true
}
