import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { rotateLineup } from '../lib/volleyball/rotationLogic'
import { matchServiceV2 } from '@/services/matchServiceV2'

// --- Types ---

export type MatchEventType =
    | 'POINT_US'
    | 'POINT_OPPONENT'
    | 'FREEBALL'
    | 'FREEBALL_SENT'
    | 'FREEBALL_RECEIVED'
    | 'TIMEOUT'
    | 'RECEPTION_EVAL'
    | 'SET_START'
    | 'SET_END'
    | 'SET_LINEUP'
    | 'SET_SERVICE_CHOICE'
    | 'SUBSTITUTION'

export interface PlayerV2 {
    id: string
    number: number
    name: string
    role: string
}

export interface MatchEvent {
    id: string
    matchId: string
    timestamp: string
    type: MatchEventType
    payload?: {
        reason?: string
        playerId?: string // Player responsible for the action (attack, block, error, etc.)
        setNumber?: number
        winner?: 'home' | 'away'
        score?: { home: number; away: number }
        initialServingSide?: 'our' | 'opponent'
        team?: 'home' | 'away' // For TIMEOUT events - which team requested
        lineup?: {
            position: 1 | 2 | 3 | 4 | 5 | 6
            playerId: string
            player: PlayerV2 // Snapshot
        }[]
        liberoId?: string
        reception?: {
            playerId: string
            value: 0 | 1 | 2 | 3 | 4
        }
        substitution?: {
            playerOutId: string
            playerInId: string
            position: 1 | 2 | 3 | 4 | 5 | 6
            setNumber: number
            playerIn: PlayerV2 // Snapshot of player entering
            isLiberoSwap: boolean // Nuevo: indica si es cambio líbero↔líbero
        }
    }
}

export interface SetSummary {
    setNumber: number
    homeScore: number
    awayScore: number
    setsWonHome: number
    setsWonAway: number
    pointsByType: {
        home: {
            serve: number
            attack: number
            block: number
            opponentError: number
        }
        away: {
            serve: number
            attack: number
            block: number
            opponentError: number
        }
    }
    maxRunHome: number
    maxRunAway: number
}

// FIVB Substitution Tracking Types
interface SubstitutionPair {
    starterId: string       // Jugadora inicial/titular
    substituteId: string    // Suplente que entró
    usesCount: number       // 1 o 2 (máx 2 usos por pareja)
}

interface SetSubstitutionState {
    setNumber: number
    totalSubstitutions: number  // De 0 a 6 por set
    pairs: SubstitutionPair[]   // Parejas activas en este set
}

export interface DerivedMatchState {
    homeScore: number
    awayScore: number
    setsWonHome: number
    setsWonAway: number
    currentSet: number
    ourSide: 'home' | 'away'
    opponentSide: 'home' | 'away'
    servingSide: 'our' | 'opponent'
    servingTeam: 'home' | 'away'       // Explicit serving team (derived from servingSide + ourSide)
    receivingTeam: 'home' | 'away'     // Explicit receiving team (derived from servingSide + opponentSide)
    onCourtPlayers: {
        position: 1 | 2 | 3 | 4 | 5 | 6
        player: PlayerV2
    }[]
    rotation: any[]
    hasLineupForCurrentSet: boolean
    currentLiberoId: string | null
    // New: Scores history by set
    setsScores: { setNumber: number; home: number; away: number }[]
    isSetFinished: boolean
    isMatchFinished: boolean

    // Set Summary
    lastFinishedSetSummary?: SetSummary
    setSummaryModalOpen: boolean

    // FIVB Substitution Tracking
    substitutionsBySet: Record<number, SetSubstitutionState>
    currentSetSubstitutions: SetSubstitutionState

    // Timeout Tracking (max 2 per team per set)
    timeoutsHome: number  // 0, 1, or 2 for current set
    timeoutsAway: number  // 0, 1, or 2 for current set
}

export interface MatchV2State {
    // Current Match Data
    dbMatchId: string | null
    ourSide: 'home' | 'away'
    initialOnCourtPlayers: PlayerV2[]
    dismissedSetSummaries: number[] // Track closed summaries

    // Team Names (STABLE - do NOT recalculate)
    homeTeamName: string | null
    awayTeamName: string | null

    // Auto-save tracking
    lastAutoSaveAt: number | null
    pendingAutoSave: boolean

    // Event Sourcing
    events: MatchEvent[]

    // Derived State
    derivedState: DerivedMatchState

    // Actions
    loadMatch: (dbMatchId: string, events: any[], ourSide: 'home' | 'away', teamNames?: { home: string; away: string }) => void
    setInitialOnCourtPlayers: (players: PlayerV2[]) => void
    addEvent: (type: MatchEventType, payload?: any) => void
    addReceptionEval: (playerId: string, rating: 0 | 1 | 2 | 3 | 4) => void
    undoEvent: () => void
    autoSaveEvents: () => Promise<void>
    // redoEvent removed - Redo functionality not used in product scope
    reset: () => void
    closeSetSummaryModal: () => void
}

const INITIAL_DERIVED_STATE: DerivedMatchState = {
    homeScore: 0,
    awayScore: 0,
    setsWonHome: 0,
    setsWonAway: 0,
    currentSet: 1,
    ourSide: 'home', // default
    opponentSide: 'away',
    servingSide: 'our', // default
    servingTeam: 'home',  // default (derived from servingSide='our' + ourSide='home')
    receivingTeam: 'away', // default (derived from servingSide='our' + opponentSide='away')
    onCourtPlayers: [],
    rotation: [],
    hasLineupForCurrentSet: false,
    currentLiberoId: null,

    setsScores: [],
    isSetFinished: false,
    isMatchFinished: false,

    setSummaryModalOpen: false,

    // FIVB Substitution Tracking - Set 1 inicial
    substitutionsBySet: {
        1: {
            setNumber: 1,
            totalSubstitutions: 0,
            pairs: []
        }
    },
    currentSetSubstitutions: {
        setNumber: 1,
        totalSubstitutions: 0,
        pairs: []
    },

    // Timeout Tracking - Reset each set
    timeoutsHome: 0,
    timeoutsAway: 0
}


/**
 * Valida si una sustitución de campo cumple las reglas FIVB
 * @param currentSetState Estado actual de sustituciones del set
 * @param playerOutId ID de la jugadora que sale
 * @param playerInId ID de la jugadora que entra
 * @param onCourtPlayers Jugadoras actualmente en pista
 * @returns { valid: boolean, reason?: string }
 */
export function validateFIVBSubstitution(
    currentSetState: SetSubstitutionState,
    playerOutId: string,
    playerInId: string,
    onCourtPlayers: { player: PlayerV2 }[]
): { valid: boolean; reason?: string } {

    // 1. Verificar límite de 6 sustituciones por set
    if (currentSetState.totalSubstitutions >= 6) {
        return {
            valid: false,
            reason: 'Límite de 6 sustituciones por set alcanzado'
        }
    }

    // 2. Verificar que playerOut está en pista
    const isPlayerOutOnCourt = onCourtPlayers.some(p => p.player.id === playerOutId)
    if (!isPlayerOutOnCourt) {
        return {
            valid: false,
            reason: 'La jugadora que sale no está en pista'
        }
    }

    // 2.5 CRITICAL: Verificar que playerIn NO está ya en pista
    // Esto previene el bug de jugadoras duplicadas en pista
    const isPlayerInOnCourt = onCourtPlayers.some(p => p.player.id === playerInId)
    if (isPlayerInOnCourt) {
        return {
            valid: false,
            reason: 'La jugadora que entra ya está en pista'
        }
    }

    // 3. Buscar parejas existentes que involucren a estas jugadoras
    const pairWithOut = currentSetState.pairs.find(
        p => p.starterId === playerOutId || p.substituteId === playerOutId
    )

    const pairWithIn = currentSetState.pairs.find(
        p => p.starterId === playerInId || p.substituteId === playerInId
    )

    // 4. Caso 1: Ninguna jugadora tiene pareja aún (primera sustitución de ambas)
    if (!pairWithOut && !pairWithIn) {
        // Nueva pareja A↔B, siempre válida si no superamos 6
        return { valid: true }
    }

    // 5. Caso 2: Ambas jugadoras ya tienen pareja
    if (pairWithOut && pairWithIn) {
        // Solo válido si son la misma pareja (están emparejadas entre sí)
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

        // Verificar que no se ha agotado la pareja (max 2 usos)
        if (pair.usesCount >= 2) {
            return {
                valid: false,
                reason: 'Esta pareja ya ha agotado sus cambios (máx 2 por set)'
            }
        }

        // Verificar dirección correcta del cambio
        // Si titular está saliendo, suplente debe entrar (reentrada de titular)
        // Si suplente está saliendo, titular debe entrar (primera entrada de titular)
        const validDirection = (
            (pair.substituteId === playerOutId && pair.starterId === playerInId) || // Suplente sale, titular entra
            (pair.starterId === playerOutId && pair.substituteId === playerInId)    // Titular sale (no debería pasar en uso 2)
        )

        if (!validDirection) {
            return {
                valid: false,
                reason: 'Dirección de cambio incorrecta para esta pareja'
            }
        }

        return { valid: true }
    }

    // 6. Caso 3: Solo una de las jugadoras tiene pareja
    if (pairWithOut || pairWithIn) {
        // Una jugadora ya emparejada no puede cambiar con otra jugadora
        return {
            valid: false,
            reason: 'Una de las jugadoras ya tiene pareja asignada'
        }
    }

    // Por defecto, permitir
    return { valid: true }
}

// --- Main Reducer ---

export function calculateDerivedState(

    events: MatchEvent[],
    ourSide: 'home' | 'away',
    initialPlayers: PlayerV2[],
    dismissedSetSummaries: number[] = []
): DerivedMatchState {
    // CRITICAL C6 FIX: Deduplicate events by ID to prevent corruption
    // This prevents duplicate events from being processed twice
    const uniqueEvents = Array.from(new Map(events.map(e => [e.id, e])).values())

    if (uniqueEvents.length !== events.length) {
        const duplicateCount = events.length - uniqueEvents.length
        console.error('⚠️ CRITICAL C6: Duplicate events detected in calculateDerivedState')
        console.error(`  Total events: ${events.length}`)
        console.error(`  Unique events: ${uniqueEvents.length}`)
        console.error(`  Duplicates removed: ${duplicateCount}`)
    }

    const state = { ...INITIAL_DERIVED_STATE }
    state.ourSide = ourSide
    state.opponentSide = ourSide === 'home' ? 'away' : 'home'

    // Internal tracker for scores per set
    const setScoresMap: Record<number, { home: number; away: number }> = {
        1: { home: 0, away: 0 }
    }

    // Stats trackers for current set
    // We need to track stats for ALL sets to find the summaries
    const setStats: Record<number, SetSummary> = {}

    // Init function for set stats
    const initSetStats = (setNum: number) => {
        if (!setStats[setNum]) {
            setStats[setNum] = {
                setNumber: setNum,
                homeScore: 0,
                awayScore: 0,
                setsWonHome: 0,
                setsWonAway: 0,
                pointsByType: {
                    home: { serve: 0, attack: 0, block: 0, opponentError: 0 },
                    away: { serve: 0, attack: 0, block: 0, opponentError: 0 }
                },
                maxRunHome: 0,
                maxRunAway: 0
            }
        }
    }
    initSetStats(1)

    // Run trackers
    let currentRunOwner: 'home' | 'away' | null = null
    let currentRunCount = 0

    const updateRun = (winner: 'home' | 'away', setNum: number) => {
        if (currentRunOwner === winner) {
            currentRunCount++
        } else {
            currentRunOwner = winner
            currentRunCount = 1
        }

        const stats = setStats[setNum]
        if (winner === 'home') {
            if (currentRunCount > stats.maxRunHome) stats.maxRunHome = currentRunCount
        } else {
            if (currentRunCount > stats.maxRunAway) stats.maxRunAway = currentRunCount
        }
    }

    // Helper to update servingTeam and receivingTeam based on servingSide
    const updateServingTeams = () => {
        state.servingTeam = state.servingSide === 'our' ? state.ourSide : state.opponentSide
        state.receivingTeam = state.servingSide === 'our' ? state.opponentSide : state.ourSide
    }

    // Internal tracker for initial service choice per set
    const initialServeBySet: Record<number, 'our' | 'opponent'> = {}


    // Fallback/Legacy init for players
    state.onCourtPlayers = initialPlayers.map((p, i) => ({
        position: ((i + 1) % 6 || 6) as 1 | 2 | 3 | 4 | 5 | 6,
        player: p
    }))

    for (const event of uniqueEvents) {
        // Ensure we have a score object for the current set logic
        // IMPORTANT: state.currentSet changes on SET_START
        // Check event type first to handle set progression

        if (!setScoresMap[state.currentSet]) {
            setScoresMap[state.currentSet] = { home: 0, away: 0 }
            initSetStats(state.currentSet)
        }

        const currentStats = setStats[state.currentSet]

        switch (event.type) {
            case 'SET_SERVICE_CHOICE':
                if (event.payload?.setNumber && event.payload?.initialServingSide) {
                    initialServeBySet[event.payload.setNumber] = event.payload.initialServingSide
                    if (event.payload.setNumber === state.currentSet) {
                        state.servingSide = event.payload.initialServingSide
                        updateServingTeams()
                    }
                }
                break

            case 'SET_START':
                // Reset run for new set
                currentRunOwner = null
                currentRunCount = 0

                if (event.payload?.setNumber) {
                    state.currentSet = event.payload.setNumber
                } else {
                    state.currentSet++
                }

                if (!setScoresMap[state.currentSet]) {
                    setScoresMap[state.currentSet] = { home: 0, away: 0 }
                    initSetStats(state.currentSet)
                }

                state.hasLineupForCurrentSet = false
                state.onCourtPlayers = []
                state.currentLiberoId = null
                state.isSetFinished = false

                // NUEVO: Inicializar estado de sustituciones para este set
                if (!state.substitutionsBySet[state.currentSet]) {
                    state.substitutionsBySet[state.currentSet] = {
                        setNumber: state.currentSet,
                        totalSubstitutions: 0,
                        pairs: []
                    }
                }
                state.currentSetSubstitutions = state.substitutionsBySet[state.currentSet]

                // Reset timeouts for new set
                state.timeoutsHome = 0
                state.timeoutsAway = 0

                if (state.currentSet === 5) {
                    if (initialServeBySet[5]) {
                        state.servingSide = initialServeBySet[5]
                    }
                } else {
                    const set1Choice = initialServeBySet[1] || 'our'
                    if (state.currentSet === 3) {
                        state.servingSide = set1Choice
                    } else {
                        state.servingSide = set1Choice === 'our' ? 'opponent' : 'our'
                    }
                }
                updateServingTeams()
                break

            case 'POINT_US':
                let scoreUs = setScoresMap[state.currentSet]
                if (state.ourSide === 'home') {
                    scoreUs.home++
                    updateRun('home', state.currentSet)
                } else {
                    scoreUs.away++
                    updateRun('away', state.currentSet)
                }
                setScoresMap[state.currentSet] = scoreUs

                // Track Point Type
                const reasonUs = event.payload?.reason
                const statsTargetUs = state.ourSide === 'home' ? currentStats.pointsByType.home : currentStats.pointsByType.away

                if (reasonUs === 'serve_point') statsTargetUs.serve++
                else if (reasonUs === 'attack_point') statsTargetUs.attack++
                else if (reasonUs === 'block_point') statsTargetUs.block++
                else if (reasonUs === 'opponent_error') statsTargetUs.opponentError++


                if (state.servingSide === 'opponent') {
                    const currentIds = [1, 2, 3, 4, 5, 6].map(pos =>
                        state.onCourtPlayers.find(p => p.position === pos)?.player.id
                    ).filter((id): id is string => id !== undefined)

                    if (currentIds.length === 6) {
                        const rotatedIds = rotateLineup(currentIds)
                        const playerMap = new Map(state.onCourtPlayers.map(p => [p.player.id, p.player]))
                        state.onCourtPlayers = rotatedIds.map((id, index) => ({
                            position: (index + 1) as 1 | 2 | 3 | 4 | 5 | 6,
                            player: playerMap.get(id)!
                        }))
                    }
                }

                state.servingSide = 'our'
                updateServingTeams()
                break

            case 'POINT_OPPONENT':
                let scoreOpp = setScoresMap[state.currentSet]
                if (state.opponentSide === 'home') {
                    scoreOpp.home++
                    updateRun('home', state.currentSet)
                } else {
                    scoreOpp.away++
                    updateRun('away', state.currentSet)
                }
                setScoresMap[state.currentSet] = scoreOpp

                // Track Point Type (Opponent)
                const reasonOpp = event.payload?.reason
                // Opponent stats: If ourSide is home, opponent is away.
                const statsTargetOpp = state.opponentSide === 'home' ? currentStats.pointsByType.home : currentStats.pointsByType.away

                // Logic: 
                // opponent_point -> Attack (Generic)
                // attack_blocked -> Block (They blocked us)
                // service_error -> Opponent Error (They got point via our service error) -> THIS IS OPPONENT ERROR FOR US? 
                // Wait. "Opponent Error" means WE got a point because THEY made an error.
                // Here, THEY got a point.
                // So if THEY got a point via 'service_error', it means WE served out. That is NOT an "Opponent Error". That is "Our Error".
                // Does the summary ask for "Points scored by Opponent Error"?
                // "Distribución de puntos por tipo (saque/ataque/bloqueo/error rival) por equipo."
                // "Home Team": Points via Serve, Attack, Block, Opponent Error.
                // "Away Team": Points via Serve, Attack, Block, Opponent Error.
                // So for AWAY team, if they got a point via OUR service error, that is "Points via Opponent Error" (from their perspective).
                // So: 
                // service_error (We missed serve) -> Away team gets point via Opponent Error.
                // attack_error (We missed attack) -> Away team gets point via Opponent Error.
                // reception_error (We missed reception) -> Away team gets point via Serve (Ace). (Handled in RECEPTION_EVAL 0/OpponentPoint logic)

                if (reasonOpp === 'opponent_point') statsTargetOpp.attack++ // Generic assumption
                else if (reasonOpp === 'attack_blocked') statsTargetOpp.block++
                else if (reasonOpp === 'service_error' || reasonOpp === 'attack_error') statsTargetOpp.opponentError++
                else if (reasonOpp === 'reception_error') statsTargetOpp.serve++ // Ace for them

                state.servingSide = 'opponent'
                updateServingTeams()
                break

            case 'RECEPTION_EVAL':
                const val = event.payload?.reception?.value
                if (val === 0) {
                    let scoreRec = setScoresMap[state.currentSet]
                    if (state.opponentSide === 'home') {
                        scoreRec.home++
                        updateRun('home', state.currentSet)
                    } else {
                        scoreRec.away++
                        updateRun('away', state.currentSet)
                    }
                    setScoresMap[state.currentSet] = scoreRec

                    // Ace for Opponent
                    const statsTargetRec = state.opponentSide === 'home' ? currentStats.pointsByType.home : currentStats.pointsByType.away
                    statsTargetRec.serve++

                    state.servingSide = 'opponent'
                    updateServingTeams()
                }
                break

            case 'SET_END':
                if (event.payload?.winner === 'home') {
                    state.setsWonHome++
                } else if (event.payload?.winner === 'away') {
                    state.setsWonAway++
                }
                state.isSetFinished = true
                if (state.setsWonHome >= 3 || state.setsWonAway >= 3) {
                    state.isMatchFinished = true
                }

                // Finalize Set Stats
                const finishedSet = event.payload?.setNumber
                if (finishedSet && setStats[finishedSet]) {
                    setStats[finishedSet].homeScore = event.payload?.score?.home || 0
                    setStats[finishedSet].awayScore = event.payload?.score?.away || 0
                    setStats[finishedSet].setsWonHome = state.setsWonHome
                    setStats[finishedSet].setsWonAway = state.setsWonAway

                    // Determine if this is the "Last Finished Set" to show modal
                    // We only show it if it hasn't been dismissed
                    if (!dismissedSetSummaries.includes(finishedSet)) {
                        state.lastFinishedSetSummary = setStats[finishedSet]
                        state.setSummaryModalOpen = true
                    }
                }
                break

            case 'SET_LINEUP':
                if (event.payload?.setNumber === state.currentSet && event.payload.lineup) {
                    state.hasLineupForCurrentSet = true
                    state.onCourtPlayers = event.payload.lineup.map(item => ({
                        position: item.position,
                        player: item.player
                    }))
                    state.currentLiberoId = event.payload.liberoId || null
                }
                break

            case 'SUBSTITUTION':
                if (event.payload?.substitution?.setNumber === state.currentSet) {
                    const { playerOutId, position, playerIn, isLiberoSwap } = event.payload.substitution

                    if (isLiberoSwap) {
                        // CASO LÍBERO↔LÍBERO: Solo actualizar currentLiberoId
                        // No modificar onCourtPlayers (las 6 de campo siguen igual)
                        // NO afecta sustituciones de campo FIVB
                        state.currentLiberoId = playerIn.id
                    } else {
                        // CASO CAMPO↔CAMPO: Actualizar jugadora + tracking FIVB

                        // 1. Actualizar jugadora en pista
                        state.onCourtPlayers = state.onCourtPlayers.map(entry => {
                            if (entry.player.id === playerOutId && entry.position === position) {
                                return {
                                    position: entry.position,
                                    player: playerIn
                                }
                            }
                            return entry
                        })

                        // 2. Tracking FIVB: Actualizar estado de sustituciones
                        // IMPORTANTE: No mutar directamente el estado, reconstruir desde eventos
                        const setNum = event.payload.substitution.setNumber

                        // Obtener estado actual del set (o crear uno nuevo)
                        let currentSetState = state.substitutionsBySet[setNum]
                        if (!currentSetState) {
                            currentSetState = {
                                setNumber: setNum,
                                totalSubstitutions: 0,
                                pairs: []
                            }
                        }

                        // Normalizar IDs para identificar pareja
                        const id1 = playerOutId
                        const id2 = playerIn.id
                        const normalizedStarterId = id1 < id2 ? id1 : id2
                        const normalizedSubstituteId = id1 < id2 ? id2 : id1

                        // Buscar pareja existente
                        const existingPairIndex = currentSetState.pairs.findIndex(
                            p => p.starterId === normalizedStarterId && p.substituteId === normalizedSubstituteId
                        )

                        // Crear nuevo array de parejas (inmutable)
                        let newPairs = [...currentSetState.pairs]

                        if (existingPairIndex >= 0) {
                            // Pareja existe: incrementar usesCount (crear nuevo objeto)
                            newPairs[existingPairIndex] = {
                                ...newPairs[existingPairIndex],
                                usesCount: newPairs[existingPairIndex].usesCount + 1
                            }
                        } else {
                            // Pareja nueva: añadir
                            newPairs.push({
                                starterId: normalizedStarterId,
                                substituteId: normalizedSubstituteId,
                                usesCount: 1
                            })
                        }

                        // Crear nuevo objeto de estado (inmutable)
                        const newSetState = {
                            setNumber: setNum,
                            totalSubstitutions: currentSetState.totalSubstitutions + 1,
                            pairs: newPairs
                        }

                        // Actualizar en el mapa (reemplazar, no mutar)
                        state.substitutionsBySet = {
                            ...state.substitutionsBySet,
                            [setNum]: newSetState
                        }

                        // Actualizar referencia rápida
                        state.currentSetSubstitutions = newSetState
                    }
                }
                break

            case 'TIMEOUT':
                // Count timeouts per team for current set
                if (event.payload?.team === 'home') {
                    state.timeoutsHome = Math.min(state.timeoutsHome + 1, 2)
                } else if (event.payload?.team === 'away') {
                    state.timeoutsAway = Math.min(state.timeoutsAway + 1, 2)
                }
                break
        }
    }

    // After processing all events, verify/re-apply serving side logic if no points have been scored in current set
    const currentScoresCheck = setScoresMap[state.currentSet] || { home: 0, away: 0 }
    if (currentScoresCheck.home === 0 && currentScoresCheck.away === 0) {
        if (state.currentSet === 1) {
            if (initialServeBySet[1]) state.servingSide = initialServeBySet[1]
        } else if (state.currentSet === 5) {
            if (initialServeBySet[5]) state.servingSide = initialServeBySet[5]
        } else {
            const set1Choice = initialServeBySet[1] || 'our'
            if (state.currentSet === 3) {
                state.servingSide = set1Choice
            } else {
                state.servingSide = set1Choice === 'our' ? 'opponent' : 'our'
            }
        }
        updateServingTeams()
    }

    const currentScores = setScoresMap[state.currentSet] || { home: 0, away: 0 }
    state.homeScore = currentScores.home
    state.awayScore = currentScores.away

    state.setsScores = Object.entries(setScoresMap).map(([setNum, scores]) => ({
        setNumber: parseInt(setNum),
        home: scores.home,
        away: scores.away
    }))

    return state
}


// Helper to check if set should end
function checkSetEnd(state: DerivedMatchState): { shouldEnd: boolean; winner: 'home' | 'away' | null } {
    const { homeScore, awayScore, currentSet } = state

    // Tie-break rules (Set 5)
    if (currentSet === 5) {
        if (homeScore >= 15 && homeScore - awayScore >= 2) return { shouldEnd: true, winner: 'home' }
        if (awayScore >= 15 && awayScore - homeScore >= 2) return { shouldEnd: true, winner: 'away' }
    } else {
        // Normal Sets (1-4)
        if (homeScore >= 25 && homeScore - awayScore >= 2) return { shouldEnd: true, winner: 'home' }
        if (awayScore >= 25 && awayScore - homeScore >= 2) return { shouldEnd: true, winner: 'away' }
    }

    return { shouldEnd: false, winner: null }
}

// --- Store ---

export const useMatchStoreV2 = create<MatchV2State>()(
    persist(
        (set, get) => ({
            dbMatchId: null,
            ourSide: 'home',
            initialOnCourtPlayers: [],
            dismissedSetSummaries: [],
            homeTeamName: null,
            awayTeamName: null,
            lastAutoSaveAt: null,
            pendingAutoSave: false,
            events: [],
            derivedState: INITIAL_DERIVED_STATE,

            loadMatch: (dbMatchId, events, ourSide, teamNames) => {
                // STEP 1: Reset state immediately with INITIAL_DERIVED_STATE
                // CRITICAL C3 FIX: This prevents visual "flash" of previous match data
                set({
                    dbMatchId,
                    ourSide,
                    events: [],
                    derivedState: INITIAL_DERIVED_STATE,  // ← Reset first to clean slate
                    homeTeamName: teamNames?.home ?? null,
                    awayTeamName: teamNames?.away ?? null,
                    dismissedSetSummaries: []
                })

                // STEP 2: Calculate new derived state from loaded events
                set((state) => {
                    const mappedEvents = events.map(e => ({
                        ...e,
                        timestamp: e.timestamp || new Date().toISOString()
                    }))

                    // CRITICAL C1 VALIDATION: Check if SET_LINEUP exists for set 1
                    // This prevents crashes when loading incomplete/corrupted match data
                    const hasLineupSet1 = mappedEvents.some(e =>
                        e.type === 'SET_LINEUP' && e.payload?.setNumber === 1
                    )

                    if (!hasLineupSet1) {
                        // Match needs starter selection - UI will trigger modal
                    }

                    // CRITICAL FIX: Auto-dismiss completed sets when loading match
                    // Strategy: Calculate derived state first to know currentSet,
                    // then auto-dismiss all sets before currentSet

                    // Step 1: Calculate initial derived state to determine currentSet
                    const initialDerived = calculateDerivedState(mappedEvents, ourSide, state.initialOnCourtPlayers, [])

                    // Step 2: Auto-dismiss ALL sets before currentSet
                    // If we're at Set 2, dismiss Set 1. If at Set 3, dismiss Sets 1 and 2, etc.
                    const autoDismissedSets: number[] = []
                    for (let i = 1; i < initialDerived.currentSet; i++) {
                        autoDismissedSets.push(i)
                    }

                    // Step 3: Recalculate with dismissed sets if needed
                    const derived = autoDismissedSets.length > 0
                        ? calculateDerivedState(mappedEvents, ourSide, state.initialOnCourtPlayers, autoDismissedSets)
                        : initialDerived

                    return {
                        events: mappedEvents,
                        derivedState: derived,
                        dismissedSetSummaries: autoDismissedSets
                    }
                })
            },

            setInitialOnCourtPlayers: (players) => {
                const { events, ourSide, dismissedSetSummaries } = get()
                const derived = calculateDerivedState(events, ourSide, players, dismissedSetSummaries)
                set({
                    initialOnCourtPlayers: players,
                    derivedState: derived
                })
            },

            addEvent: (type, payload) => {
                const { dbMatchId, events, ourSide, initialOnCourtPlayers, dismissedSetSummaries } = get()
                if (!dbMatchId) return

                if (get().derivedState.isMatchFinished) {
                    console.warn('Match is finished. Cannot add new events.')
                    return
                }

                if (get().derivedState.isSetFinished && (type === 'POINT_US' || type === 'POINT_OPPONENT')) {
                    console.warn('Set is finished. Cannot add points.')
                    return
                }

                const newEvent: MatchEvent = {
                    id: crypto.randomUUID(),
                    matchId: dbMatchId,
                    timestamp: new Date().toISOString(),
                    type,
                    payload
                }

                let tempEvents = [...events, newEvent]
                let tempDerived = calculateDerivedState(tempEvents, ourSide, initialOnCourtPlayers, dismissedSetSummaries)
                const { shouldEnd, winner } = checkSetEnd(tempDerived)

                if (shouldEnd && winner) {
                    const currentSet = tempDerived.currentSet
                    const setEndEvent: MatchEvent = {
                        id: crypto.randomUUID(),
                        matchId: dbMatchId,
                        timestamp: new Date().toISOString(),
                        type: 'SET_END',
                        payload: {
                            setNumber: currentSet,
                            winner,
                            score: { home: tempDerived.homeScore, away: tempDerived.awayScore }
                        }
                    }
                    tempEvents.push(setEndEvent)

                    const stateAfterSetEnd = calculateDerivedState(tempEvents, ourSide, initialOnCourtPlayers, dismissedSetSummaries)
                    const homeWins = stateAfterSetEnd.setsWonHome
                    const awayWins = stateAfterSetEnd.setsWonAway

                    if (homeWins < 3 && awayWins < 3) {
                        const setStartEvent: MatchEvent = {
                            id: crypto.randomUUID(),
                            matchId: dbMatchId,
                            timestamp: new Date().toISOString(),
                            type: 'SET_START',
                            payload: {
                                setNumber: currentSet + 1
                            }
                        }
                        tempEvents.push(setStartEvent)
                    }
                }

                const finalDerived = calculateDerivedState(tempEvents, ourSide, initialOnCourtPlayers, dismissedSetSummaries)

                set({
                    events: tempEvents,
                    derivedState: finalDerived
                })

                // Auto-save logic: save every 5 events, every 15s, or on critical events
                const state = get()
                const timeSinceLastSave = Date.now() - (state.lastAutoSaveAt ?? 0)
                const shouldSaveByCount = tempEvents.length % 5 === 0
                const shouldSaveByTime = timeSinceLastSave > 15000 // 15 seconds
                const isCriticalEvent = type === 'SET_END'

                if (shouldSaveByCount || shouldSaveByTime || isCriticalEvent) {
                    // Auto-save asynchronously
                    state.autoSaveEvents()
                }
            },

            undoEvent: () => {
                const { events, ourSide, initialOnCourtPlayers, dismissedSetSummaries } = get()
                if (events.length === 0) return

                const newEvents = events.slice(0, -1)
                const newDerived = calculateDerivedState(newEvents, ourSide, initialOnCourtPlayers, dismissedSetSummaries)

                set({
                    events: newEvents,
                    derivedState: newDerived
                })

                // Auto-save after undo
                get().autoSaveEvents()
            },

            // Add reception evaluation event
            addReceptionEval: (playerId: string, rating: 0 | 1 | 2 | 3 | 4) => {
                const state = get()
                get().addEvent('RECEPTION_EVAL', {
                    reception: {
                        playerId,
                        value: rating
                    },
                    setNumber: state.derivedState.currentSet
                })
            },

            // redoEvent removed - Redo functionality not used in product scope

            reset: () => set({
                dbMatchId: null,
                initialOnCourtPlayers: [],
                dismissedSetSummaries: [],
                homeTeamName: null,
                awayTeamName: null,
                lastAutoSaveAt: null,
                pendingAutoSave: false,
                events: [],
                derivedState: INITIAL_DERIVED_STATE
            }),

            closeSetSummaryModal: () => {
                const { derivedState, dismissedSetSummaries, events, ourSide, initialOnCourtPlayers } = get()
                const setNum = derivedState.lastFinishedSetSummary?.setNumber
                if (setNum) {
                    const newDismissed = [...dismissedSetSummaries, setNum]
                    const newDerived = calculateDerivedState(events, ourSide, initialOnCourtPlayers, newDismissed)
                    set({
                        dismissedSetSummaries: newDismissed,
                        derivedState: newDerived
                    })
                } else {
                    // Just force close if no summary
                    set(state => ({
                        derivedState: {
                            ...state.derivedState,
                            setSummaryModalOpen: false
                        }
                    }))
                }
            },

            // Auto-save events to Supabase
            autoSaveEvents: async () => {
                const { dbMatchId, events, pendingAutoSave } = get()

                // Don't save if already saving or no match loaded
                if (!dbMatchId || pendingAutoSave || events.length === 0) return

                set({ pendingAutoSave: true })

                try {
                    await matchServiceV2.updateMatchV2(dbMatchId, {
                        actions: events
                    })
                    set({
                        lastAutoSaveAt: Date.now(),
                        pendingAutoSave: false
                    })
                } catch (err) {
                    console.error('[Auto-Save] Failed to save events:', err)
                    set({ pendingAutoSave: false })
                    // Fail silently - don't show toast, will retry on next trigger
                }
            },
        }),
        {
            name: 'match-store-v2',
            partialize: (state) => ({
                dbMatchId: state.dbMatchId,
                ourSide: state.ourSide,
                initialOnCourtPlayers: state.initialOnCourtPlayers,
                homeTeamName: state.homeTeamName, // Now persisted at root level
                awayTeamName: state.awayTeamName, // Now persisted at root level
                // CRITICAL: Do NOT persist dismissedSetSummaries
                // Persisting it causes modals to not appear on page reload
                events: state.events,
                // derivedState no longer needs special handling for team names
                derivedState: state.derivedState
            })
        }
    )
)
