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

    // Set Summary
    lastFinishedSetSummary?: SetSummary
    setSummaryModalOpen: boolean
}

export interface MatchV2State {
    // Current Match Data
    dbMatchId: string | null
    ourSide: 'home' | 'away'
    initialOnCourtPlayers: PlayerV2[]
    dismissedSetSummaries: number[] // Track closed summaries

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
    onCourtPlayers: [],
    rotation: [],
    hasLineupForCurrentSet: false,
    currentLiberoId: null,

    setsScores: [],
    homeTeamName: 'Local',
    awayTeamName: 'Visitante',
    isSetFinished: false,
    isMatchFinished: false,

    setSummaryModalOpen: false
}


function calculateDerivedState(

    events: MatchEvent[],
    ourSide: 'home' | 'away',
    initialPlayers: PlayerV2[],
    dismissedSetSummaries: number[] = []
): DerivedMatchState {
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


    // Internal tracker for initial service choice per set
    const initialServeBySet: Record<number, 'our' | 'opponent'> = {}


    // Fallback/Legacy init for players
    state.onCourtPlayers = initialPlayers.map((p, i) => ({
        position: ((i + 1) % 6 || 6) as 1 | 2 | 3 | 4 | 5 | 6,
        player: p
    }))

    for (const event of events) {
        // Ensure we have a score object for the current set logic
        // IMPORTANT: state.currentSet changes on SET_START
        // Check event type first to handle set progression

        let eventSet = state.currentSet
        if (event.type === 'SET_START' && event.payload?.setNumber) {
            // The SET_START moves us to next set. 
            // Previous set is finished. Stats for PREVIOUS set are done effectively (except if undo).
            // But we track stats based on `state.currentSet` at time of event? 
            // Actually `state.currentSet` updates INSIDE the loop. 
        }

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
                    } else {
                        // Even if dismissed, we might update lastFinishedSetSummary for reference?
                        // No, if dismissed, modal shouldn't open.
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
            events: [],
            futureEvents: [],
            derivedState: INITIAL_DERIVED_STATE,

            loadMatch: (dbMatchId, events, ourSide, teamNames) => {
                set((state) => {
                    const mappedEvents = events.map(e => ({
                        ...e,
                        timestamp: e.timestamp || new Date().toISOString()
                    }))

                    console.log('[DEBUG loadMatch] Before reset', { dismissedSetSummaries: state.dismissedSetSummaries })
                    
                    // CRITICAL FIX: Always use empty array for dismissedSetSummaries on load
                    // This prevents persisted dismissed summaries from blocking new set modals
                    const derived = calculateDerivedState(mappedEvents, ourSide, state.initialOnCourtPlayers, [])

                    if (teamNames) {
                        derived.homeTeamName = teamNames.home
                        derived.awayTeamName = teamNames.away
                    }

                    return {
                        dbMatchId,
                        ourSide,
                        events: mappedEvents,
                        futureEvents: [],
                        derivedState: derived,
                        dismissedSetSummaries: [] // RESET on match load
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
                    futureEvents: [],
                    derivedState: finalDerived
                })

                matchServiceV2.updateMatchV2(dbMatchId, { actions: tempEvents }).catch(err => {
                    console.error('Failed to persist events (addEvent):', err)
                })
            },

            undoEvent: () => {
                const { dbMatchId, events, futureEvents, ourSide, initialOnCourtPlayers, dismissedSetSummaries } = get()
                if (events.length === 0) return

                const lastEvent = events[events.length - 1]
                const newEvents = events.slice(0, -1)
                const newFuture = [lastEvent, ...futureEvents]
                const newDerived = calculateDerivedState(newEvents, ourSide, initialOnCourtPlayers, dismissedSetSummaries)

                set({
                    events: newEvents,
                    futureEvents: newFuture,
                    derivedState: newDerived
                })

                if (dbMatchId) {
                    matchServiceV2.updateMatchV2(dbMatchId, { actions: newEvents }).catch(err => {
                        console.error('Failed to persist events (undoEvent):', err)
                    })
                }
            },

            redoEvent: () => {
                const { dbMatchId, events, futureEvents, ourSide, initialOnCourtPlayers, dismissedSetSummaries } = get()
                if (futureEvents.length === 0) return

                const nextEvent = futureEvents[0]
                const newFuture = futureEvents.slice(1)
                const newEvents = [...events, nextEvent]
                const newDerived = calculateDerivedState(newEvents, ourSide, initialOnCourtPlayers, dismissedSetSummaries)

                set({
                    events: newEvents,
                    futureEvents: newFuture,
                    derivedState: newDerived
                })

                if (dbMatchId) {
                    matchServiceV2.updateMatchV2(dbMatchId, { actions: newEvents }).catch(err => {
                        console.error('Failed to persist events (redoEvent):', err)
                    })
                }
            },

            reset: () => set({
                dbMatchId: null,
                initialOnCourtPlayers: [],
                dismissedSetSummaries: [],
                events: [],
                futureEvents: [],
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
            }
        }),
        {
            name: 'match-store-v2',
            partialize: (state) => ({
                dbMatchId: state.dbMatchId,
                ourSide: state.ourSide,
                initialOnCourtPlayers: state.initialOnCourtPlayers,
                // CRITICAL: Do NOT persist dismissedSetSummaries
                // Persisting it causes modals to not appear on page reload
                // dismissedSetSummaries: state.dismissedSetSummaries, // REMOVED
                events: state.events,
                futureEvents: state.futureEvents,
                derivedState: state.derivedState
            })
        }
    )
)
