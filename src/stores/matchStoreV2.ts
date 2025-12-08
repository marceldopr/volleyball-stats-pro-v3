import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// --- Types ---

export type MatchEventType =
    | 'POINT_US'
    | 'POINT_OPPONENT'
    | 'FREEBALL'
    | 'RECEPTION_EVAL'

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
    onCourtPlayers: PlayerV2[]
    rotation: any[] // Kept for compatibility if needed, but onCourtPlayers is primary
}

export interface MatchV2State {
    // Current Match Data
    dbMatchId: string | null
    ourSide: 'home' | 'away'
    initialOnCourtPlayers: PlayerV2[] // Store initial lineup to re-calculate derived state correctly from event 0

    // Event Sourcing
    events: MatchEvent[]
    futureEvents: MatchEvent[] // For Redo

    // Derived State (Cached for UI)
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
    ourSide: 'home', // default, will be overwritten on load
    opponentSide: 'away',
    servingSide: 'our', // default
    onCourtPlayers: [],
    rotation: []
}

function calculateDerivedState(events: MatchEvent[], ourSide: 'home' | 'away', initialPlayers: PlayerV2[]): DerivedMatchState {
    const state = { ...INITIAL_DERIVED_STATE }
    state.ourSide = ourSide
    state.opponentSide = ourSide === 'home' ? 'away' : 'home'
    state.onCourtPlayers = [...initialPlayers] // Reset to initial before applying events

    // TODO: Initial Serving Side logic. Defaults to 'our' for now.

    for (const event of events) {
        switch (event.type) {
            case 'POINT_US':
                if (state.ourSide === 'home') {
                    state.homeScore++
                } else {
                    state.awayScore++
                }

                // Serve logic: We win point -> We serve
                state.servingSide = 'our'
                break

            case 'POINT_OPPONENT':
                if (state.opponentSide === 'home') {
                    state.homeScore++
                } else {
                    state.awayScore++
                }

                // Serve logic: Opponent wins point -> Opponent serves
                state.servingSide = 'opponent'
                break

            case 'RECEPTION_EVAL':
                const val = event.payload?.reception?.value
                if (val === 0) {
                    // Direct Error -> Opponent Point
                    if (state.opponentSide === 'home') {
                        state.homeScore++
                    } else {
                        state.awayScore++
                    }
                    state.servingSide = 'opponent'
                }
                break

            // FREEBALL doesn't change score or serve directly
        }

        // Set Logic (Simplified for MVP)
        // Normal sets to 25, Tiebreak to 15. Win by 2.
    }

    return state
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
                // RESET STRATEGY:
                // When loading a new match, we must ensure NO data from the previous match (A) persists into (B).
                // We reset initialOnCourtPlayers to [] immediately.
                // The component will call setInitialOnCourtPlayers() shortly after with the correct V2 players.
                const initialPlayers: PlayerV2[] = []

                const safeEvents = (events || []) as MatchEvent[]
                const derived = calculateDerivedState(safeEvents, ourSide, initialPlayers)

                set({
                    dbMatchId,
                    ourSide,
                    initialOnCourtPlayers: initialPlayers, // Clear previous match players
                    events: safeEvents,
                    futureEvents: [], // Clear redo history on reload
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

                const newEvents = [...events, newEvent]
                const newDerived = calculateDerivedState(newEvents, ourSide, initialOnCourtPlayers)

                set({
                    events: newEvents,
                    futureEvents: [], // Clears redo history
                    derivedState: newDerived
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
