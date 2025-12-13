import { MatchEvent } from '@/stores/matchStoreV2'

/**
 * Data structure for a single set's game flow
 */
export interface SetFlowData {
    setNumber: number
    finalScoreHome: number
    finalScoreAway: number
    diffSeries: number[] // Differential after each rally (positive = home leads)
    maxAbsDiff: number   // Max absolute diff for scaling
}

/**
 * Calculate game flow data from match events
 * Returns an array of SetFlowData, one per completed set
 */
export function calculateGameFlow(
    events: MatchEvent[],
    ourSide: 'home' | 'away'
): SetFlowData[] {
    const setFlows: SetFlowData[] = []

    let currentSet = 1
    let homeScore = 0
    let awayScore = 0
    let diffSeries: number[] = []

    // Process events chronologically
    events.forEach(event => {
        // Track set changes
        if (event.type === 'SET_START') {
            // Save previous set if it has points
            if (diffSeries.length > 0) {
                const maxAbsDiff = Math.max(...diffSeries.map(d => Math.abs(d)), 1)
                setFlows.push({
                    setNumber: currentSet,
                    finalScoreHome: homeScore,
                    finalScoreAway: awayScore,
                    diffSeries: [...diffSeries],
                    maxAbsDiff
                })
            }

            // Reset for new set
            if (event.payload?.setNumber) {
                currentSet = event.payload.setNumber
            } else {
                currentSet++
            }
            homeScore = 0
            awayScore = 0
            diffSeries = []
            return
        }

        // Track points
        if (event.type === 'POINT_US') {
            if (ourSide === 'home') {
                homeScore++
            } else {
                awayScore++
            }
            diffSeries.push(homeScore - awayScore)
        } else if (event.type === 'POINT_OPPONENT') {
            if (ourSide === 'home') {
                awayScore++
            } else {
                homeScore++
            }
            diffSeries.push(homeScore - awayScore)
        }
    })

    // Save final set if it has points
    if (diffSeries.length > 0) {
        const maxAbsDiff = Math.max(...diffSeries.map(d => Math.abs(d)), 1)
        setFlows.push({
            setNumber: currentSet,
            finalScoreHome: homeScore,
            finalScoreAway: awayScore,
            diffSeries: [...diffSeries],
            maxAbsDiff
        })
    }

    return setFlows
}
