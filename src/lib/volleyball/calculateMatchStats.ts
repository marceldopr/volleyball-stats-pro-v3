/**
 * calculateMatchStats.ts
 * 
 * Pure helper to calculate match statistics for MatchFinishedModal.
 * Extracts duration, points, errors, and streaks from event array.
 */

export interface MatchEvent {
    id: string
    type: string
    timestamp: string
    payload?: {
        reason?: string
        [key: string]: any
    }
}

export interface MatchStats {
    duration: string
    totalPointsHome: number
    totalPointsAway: number
    ownErrors: number
    opponentErrors: number
    homeMaxStreak: number
    awayMaxStreak: number
}

/**
 * Calculates match statistics from events array
 * 
 * @param events - Array of match events
 * @param ourSide - Which side is "ours" ('home' | 'away')
 * @returns MatchStats object ready for MatchFinishedModal
 */
export function calculateMatchStats(
    events: MatchEvent[],
    ourSide: 'home' | 'away'
): MatchStats {
    // Helper to parse timestamp
    const getTime = (iso: string) => new Date(iso).getTime()

    // 1. Duration
    let duration = "0m"
    if (events.length > 1) {
        const start = getTime(events[0].timestamp)
        const end = getTime(events[events.length - 1].timestamp)
        const diffMs = end - start
        const hrs = Math.floor(diffMs / (1000 * 60 * 60))
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
        duration = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`
    }

    // 2. Points calculation
    const homePoints = events.filter(e =>
        (e.type === 'POINT_US' && ourSide === 'home') ||
        (e.type === 'POINT_OPPONENT' && ourSide === 'away')
    ).length

    const awayPoints = events.filter(e =>
        (e.type === 'POINT_US' && ourSide === 'away') ||
        (e.type === 'POINT_OPPONENT' && ourSide === 'home')
    ).length

    // 3. Errors (Approximation based on event flow or payload)
    const ownErrors = events.filter(e =>
        (e.type === 'POINT_OPPONENT' && ourSide === 'home') ||
        (e.type === 'POINT_US' && ourSide === 'away' && e.payload?.reason?.toLowerCase().includes('error'))
    ).length

    const opponentErrors = events.filter(e =>
        (e.type === 'POINT_US' && ourSide === 'home' && e.payload?.reason?.toLowerCase().includes('error')) ||
        (e.type === 'POINT_OPPONENT' && ourSide === 'away')
    ).length

    // 4. Max Streak calculation
    let currentHomeStreak = 0
    let maxHomeStreak = 0
    let currentAwayStreak = 0
    let maxAwayStreak = 0

    events.forEach(e => {
        const isHomePoint = (e.type === 'POINT_US' && ourSide === 'home') ||
            (e.type === 'POINT_OPPONENT' && ourSide === 'away')
        const isAwayPoint = (e.type === 'POINT_US' && ourSide === 'away') ||
            (e.type === 'POINT_OPPONENT' && ourSide === 'home')

        if (isHomePoint) {
            currentHomeStreak++
            currentAwayStreak = 0
            maxHomeStreak = Math.max(maxHomeStreak, currentHomeStreak)
        } else if (isAwayPoint) {
            currentAwayStreak++
            currentHomeStreak = 0
            maxAwayStreak = Math.max(maxAwayStreak, currentAwayStreak)
        }
    })

    return {
        duration,
        totalPointsHome: homePoints,
        totalPointsAway: awayPoints,
        ownErrors,
        opponentErrors,
        homeMaxStreak: maxHomeStreak,
        awayMaxStreak: maxAwayStreak
    }
}
