import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// --- Types ---

export type MatchEventType =
    | 'POINT_US'
    | 'POINT_OPPONENT'
    | 'FREEBALL'
    | 'RECEPTION_EVAL'
    | 'SET_START'
    | 'SET_END'
    | 'SET_LINEUP'

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
        lineup?: {
            position: 1 | 2 | 3 | 4 | 5 | 6
            playerId: string
            player: PlayerV2 // Snapshot
        }[]
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
    loadMatch: (dbMatchId: string, events: any[], ourSide: 'home' | 'away') => void
    setInitialOnCourtPlayers: (players: PlayerV2[]) => void
    addEvent: (type: MatchEventType, payload?: any) => void
    undoEvent: () => void
    redoEvent: () => void
    reset: () => void
}

// --- Helper: State Calculation ---

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
    hasLineupForCurrentSet: false
}

function calculateDerivedState(events: MatchEvent[], ourSide: 'home' | 'away', initialPlayers: PlayerV2[]): DerivedMatchState {
    const state = { ...INITIAL_DERIVED_STATE }
    state.ourSide = ourSide
    state.opponentSide = ourSide === 'home' ? 'away' : 'home'

    // Fallback/Legacy init
    state.onCourtPlayers = initialPlayers.map((p, i) => ({
        position: ((i + 1) % 6 || 6) as 1 | 2 | 3 | 4 | 5 | 6,
        player: p
    }))

    for (const event of events) {
        switch (event.type) {
            case 'POINT_US':
                if (state.ourSide === 'home') {
                    state.homeScore++
                } else {
                    state.awayScore++
                }
                state.servingSide = 'our'
                break

            case 'POINT_OPPONENT':
                if (state.opponentSide === 'home') {
                    state.homeScore++
                } else {
                    state.awayScore++
                }
                state.servingSide = 'opponent'
                break

            case 'RECEPTION_EVAL':
                const val = event.payload?.reception?.value
                if (val === 0) {
                    if (state.opponentSide === 'home') {
                        state.homeScore++
                    } else {
                        state.awayScore++
                    }
                    state.servingSide = 'opponent'
                }
                break

            case 'SET_END':
                if (event.payload?.winner === 'home') {
                    state.setsWonHome++
                } else if (event.payload?.winner === 'away') {
                    state.setsWonAway++
                }
                break

            case 'SET_LINEUP':
                if (event.payload?.setNumber === state.currentSet && event.payload.lineup) {
                    state.onCourtPlayers = event.payload.lineup.map(item => ({
                        position: item.position,
                        player: item.player
                    }))
                }
                break
        }
    }

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

            loadMatch: (dbMatchId, events, ourSide) => {
                const initialPlayers: PlayerV2[] = []
                const safeEvents = (events || []) as MatchEvent[]
                const derived = calculateDerivedState(safeEvents, ourSide, initialPlayers)

                set({
                    dbMatchId,
                    ourSide,
                    initialOnCourtPlayers: initialPlayers,
                    events: safeEvents,
                    futureEvents: [],
                    derivedState: derived
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

                    // Note: We deliberately do NOT recalculate derived here to prevent double increment 
                    // if we were in a loop, but here it's linear. SET_END will increment setsWon in next calc.

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
            },

            undoEvent: () => {
                const { events, futureEvents, ourSide, initialOnCourtPlayers } = get()
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
            },

            redoEvent: () => {
                const { events, futureEvents, ourSide, initialOnCourtPlayers } = get()
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
