import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { rotateLineup } from '../lib/volleyball/rotationLogic'
import { matchServiceV2 } from '@/services/matchServiceV2'

// --- Types ---

export type MatchEventType =
    | 'POINT_US'
    | 'POINT_OPPONENT'
    | 'FREEBALL'
    | 'RECEPTION_EVAL'
    | 'SET_START'
    | 'SET_END'
    | 'SET_LINEUP'
    | 'SET_SERVICE_CHOICE'

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
        setNumber?: number
        winner?: 'home' | 'away'
        score?: { home: number; away: number }
        initialServingSide?: 'our' | 'opponent'
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
    }
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
    onCourtPlayers: {
        position: 1 | 2 | 3 | 4 | 5 | 6
        player: PlayerV2
    }[]
    rotation: any[]
    hasLineupForCurrentSet: boolean
    currentLiberoId: string | null
    // New: Scores history by set
    setsScores: { setNumber: number; home: number; away: number }[]
    homeTeamName?: string
    awayTeamName?: string
    isSetFinished: boolean
    isMatchFinished: boolean
}

export interface MatchV2State {
    // Current Match Data
    dbMatchId: string | null
    ourSide: 'home' | 'away'
    initialOnCourtPlayers: PlayerV2[]

    // Event Sourcing
    events: MatchEvent[]
    futureEvents: MatchEvent[]

    // Derived State
    derivedState: DerivedMatchState

    // Actions
    loadMatch: (dbMatchId: string, events: any[], ourSide: 'home' | 'away', teamNames?: { home: string; away: string }) => void
    setInitialOnCourtPlayers: (players: PlayerV2[]) => void
    addEvent: (type: MatchEventType, payload?: any) => void
    undoEvent: () => void
    redoEvent: () => void
    reset: () => void
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
    onCourtPlayers: [],
    rotation: [],
    hasLineupForCurrentSet: false,
    currentLiberoId: null,

    setsScores: [],
    homeTeamName: 'Local',
    awayTeamName: 'Visitante',
    isSetFinished: false,
    isMatchFinished: false
}

function calculateDerivedState(events: MatchEvent[], ourSide: 'home' | 'away', initialPlayers: PlayerV2[]): DerivedMatchState {
    const state = { ...INITIAL_DERIVED_STATE }
    state.ourSide = ourSide
    state.opponentSide = ourSide === 'home' ? 'away' : 'home'

    // Internal tracker for scores per set
    // Start with Set 1 initialized
    const setScoresMap: Record<number, { home: number; away: number }> = {
        1: { home: 0, away: 0 }
    }

    // Internal tracker for initial service choice per set
    const initialServeBySet: Record<number, 'our' | 'opponent'> = {}



    // Fallback/Legacy init for players
    state.onCourtPlayers = initialPlayers.map((p, i) => ({
        position: ((i + 1) % 6 || 6) as 1 | 2 | 3 | 4 | 5 | 6,
        player: p
    }))

    for (const event of events) {
        // Ensure we have a score object for the current set logic
        if (!setScoresMap[state.currentSet]) {
            setScoresMap[state.currentSet] = { home: 0, away: 0 }
        }

        switch (event.type) {
            case 'SET_SERVICE_CHOICE':
                if (event.payload?.setNumber && event.payload?.initialServingSide) {
                    initialServeBySet[event.payload.setNumber] = event.payload.initialServingSide
                    // If this choice is for the current set (e.g. at start of Set 1 or Set 5), apply it immediately
                    if (event.payload.setNumber === state.currentSet) {
                        state.servingSide = event.payload.initialServingSide
                    }
                }
                break

            case 'SET_START':
                // Move to next set.
                // If payload has setNumber, use it. Otherwise increment.
                if (event.payload?.setNumber) {
                    state.currentSet = event.payload.setNumber
                } else {
                    state.currentSet++
                }

                // Initialize score for new set if not present
                if (!setScoresMap[state.currentSet]) {
                    setScoresMap[state.currentSet] = { home: 0, away: 0 }
                }

                // Reset lineup state for the new set
                state.hasLineupForCurrentSet = false
                state.onCourtPlayers = []
                state.currentLiberoId = null

                // Reset set finished flag
                state.isSetFinished = false


                // Determine serving side for this new set
                if (state.currentSet === 5) {
                    // Set 5: Independent choice (wait for SET_SERVICE_CHOICE or use if already present)
                    if (initialServeBySet[5]) {
                        state.servingSide = initialServeBySet[5]
                    }
                } else {
                    // Sets 2, 3, 4: Alternating from Set 1
                    const set1Choice = initialServeBySet[1] || 'our' // Default to 'our' if missing
                    if (state.currentSet === 3) {
                        state.servingSide = set1Choice
                    } else {
                        // Sets 2 and 4 are opposite
                        state.servingSide = set1Choice === 'our' ? 'opponent' : 'our'
                    }
                }
                break

            case 'POINT_US':
                let scoreUs = setScoresMap[state.currentSet]
                if (state.ourSide === 'home') {
                    scoreUs.home++
                } else {
                    scoreUs.away++
                }
                setScoresMap[state.currentSet] = scoreUs // Re-assign not strictly needed if obj ref, but clarity

                // Side-out: If opponent was serving, we rotate
                if (state.servingSide === 'opponent') {
                    // Extract current IDs sorted by position [P1...P6]
                    const currentIds = [1, 2, 3, 4, 5, 6].map(pos =>
                        state.onCourtPlayers.find(p => p.position === pos)?.player.id
                    ).filter((id): id is string => id !== undefined)

                    if (currentIds.length === 6) {
                        const rotatedIds = rotateLineup(currentIds)

                        // Create map to lookup player objects by ID
                        const playerMap = new Map(state.onCourtPlayers.map(p => [p.player.id, p.player]))

                        // Update positions
                        state.onCourtPlayers = rotatedIds.map((id, index) => ({
                            position: (index + 1) as 1 | 2 | 3 | 4 | 5 | 6,
                            player: playerMap.get(id)!
                        }))
                    }
                }

                state.servingSide = 'our'
                break

            case 'POINT_OPPONENT':
                let scoreOpp = setScoresMap[state.currentSet]
                if (state.opponentSide === 'home') {
                    scoreOpp.home++
                } else {
                    scoreOpp.away++
                }
                setScoresMap[state.currentSet] = scoreOpp
                state.servingSide = 'opponent'
                break

            case 'RECEPTION_EVAL':
                const val = event.payload?.reception?.value
                if (val === 0) {
                    let scoreRec = setScoresMap[state.currentSet]
                    if (state.opponentSide === 'home') {
                        scoreRec.home++
                    } else {
                        scoreRec.away++
                    }
                    setScoresMap[state.currentSet] = scoreRec
                    state.servingSide = 'opponent'
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
        }
    }

    // After processing all events, verify/re-apply serving side logic if no points have been scored in current set
    // This handles cases where SET_START happened but no points yet, ensuring correct serving side is displayed
    const currentScoresCheck = setScoresMap[state.currentSet] || { home: 0, away: 0 }
    if (currentScoresCheck.home === 0 && currentScoresCheck.away === 0) {
        // Apply serving logic again for 0-0 state to be sure
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
    }

    // After processing all events, verify/re-apply serving side logic if no points have been scored in current set
    // This handles cases where SET_START happened but no points yet, ensuring correct serving side is displayed


    // After processing all events, update the top-level score from the current set
    const currentScores = setScoresMap[state.currentSet] || { home: 0, away: 0 }
    state.homeScore = currentScores.home
    state.awayScore = currentScores.away

    // Populate setsScores array for UI
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
            events: [],
            futureEvents: [],
            derivedState: INITIAL_DERIVED_STATE,

            loadMatch: (dbMatchId, events, ourSide, teamNames) => {
                set((state) => {
                    const mappedEvents = events.map(e => ({
                        ...e,
                        timestamp: e.timestamp || new Date().toISOString()
                    }))

                    const derived = calculateDerivedState(mappedEvents, ourSide, state.initialOnCourtPlayers)

                    if (teamNames) {
                        derived.homeTeamName = teamNames.home
                        derived.awayTeamName = teamNames.away
                    }

                    return {
                        dbMatchId,
                        ourSide,
                        events: mappedEvents,
                        futureEvents: [],
                        derivedState: derived
                    }
                })
            },

            setInitialOnCourtPlayers: (players) => {
                const { events, ourSide } = get()
                const derived = calculateDerivedState(events, ourSide, players)
                set({
                    initialOnCourtPlayers: players,
                    derivedState: derived
                })
            },

            addEvent: (type, payload) => {
                const { dbMatchId, events, ourSide, initialOnCourtPlayers } = get()
                if (!dbMatchId) return

                // Guard: Prevent modifications if match is finished
                // Exception: Undo/Redo are separate actions.
                if (get().derivedState.isMatchFinished) {
                    console.warn('Match is finished. Cannot add new events.')
                    return
                }

                // Guard: Prevent scoring if set is finished (but match not over)
                // Actually, if SET_END happened, we shouldn't allow POINTs.
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

                // 1. Add current event (e.g., POINT)
                let tempEvents = [...events, newEvent]
                let tempDerived = calculateDerivedState(tempEvents, ourSide, initialOnCourtPlayers)

                // 2. Check for Set End
                const { shouldEnd, winner } = checkSetEnd(tempDerived)

                if (shouldEnd && winner) {
                    const currentSet = tempDerived.currentSet

                    // Create SET_END
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

                    // Check if match should end completely (Best of 5 -> 3 sets won)
                    // We calculate state *after* SET_END to see setsWon
                    const stateAfterSetEnd = calculateDerivedState(tempEvents, ourSide, initialOnCourtPlayers)
                    const homeWins = stateAfterSetEnd.setsWonHome
                    const awayWins = stateAfterSetEnd.setsWonAway

                    // If no one reached 3 sets, start next set
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

                // 3. Final calculation with all auto-generated events
                const finalDerived = calculateDerivedState(tempEvents, ourSide, initialOnCourtPlayers)

                set({
                    events: tempEvents,
                    futureEvents: [],
                    derivedState: finalDerived
                })

                // Persist to DB
                matchServiceV2.updateMatchV2(dbMatchId, { actions: tempEvents }).catch(err => {
                    console.error('Failed to persist events (addEvent):', err)
                })
            },

            undoEvent: () => {
                const { dbMatchId, events, futureEvents, ourSide, initialOnCourtPlayers } = get()
                if (events.length === 0) return

                const lastEvent = events[events.length - 1]
                const newEvents = events.slice(0, -1)
                const newFuture = [lastEvent, ...futureEvents]
                const newDerived = calculateDerivedState(newEvents, ourSide, initialOnCourtPlayers)

                set({
                    events: newEvents,
                    futureEvents: newFuture,
                    derivedState: newDerived
                })

                // Persist to DB
                if (dbMatchId) {
                    matchServiceV2.updateMatchV2(dbMatchId, { actions: newEvents }).catch(err => {
                        console.error('Failed to persist events (undoEvent):', err)
                    })
                }
            },

            redoEvent: () => {
                const { dbMatchId, events, futureEvents, ourSide, initialOnCourtPlayers } = get()
                if (futureEvents.length === 0) return

                const nextEvent = futureEvents[0]
                const newFuture = futureEvents.slice(1)
                const newEvents = [...events, nextEvent]
                const newDerived = calculateDerivedState(newEvents, ourSide, initialOnCourtPlayers)

                set({
                    events: newEvents,
                    futureEvents: newFuture,
                    derivedState: newDerived
                })

                // Persist to DB
                if (dbMatchId) {
                    matchServiceV2.updateMatchV2(dbMatchId, { actions: newEvents }).catch(err => {
                        console.error('Failed to persist events (redoEvent):', err)
                    })
                }
            },

            reset: () => set({
                dbMatchId: null,
                initialOnCourtPlayers: [],
                events: [],
                futureEvents: [],
                derivedState: INITIAL_DERIVED_STATE
            })
        }),
        {
            name: 'match-store-v2',
            partialize: (state) => ({
                // Persist everything for crash recovery
                dbMatchId: state.dbMatchId,
                ourSide: state.ourSide,
                initialOnCourtPlayers: state.initialOnCourtPlayers,
                events: state.events,
                futureEvents: state.futureEvents,
                derivedState: state.derivedState
            })
        }
    )
)
