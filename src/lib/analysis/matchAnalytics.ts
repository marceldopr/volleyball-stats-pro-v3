import { MatchEvent } from '@/stores/matchStore'

interface PointsByType {
    home: {
        attack: number
        block: number
        serve: number
        opponentError: number
    }
    away: {
        attack: number
        block: number
        serve: number
        opponentError: number
    }
}

interface PlayerStats {
    playerId: string
    playerName: string
    positiveActions: number
    negativeActions: number
    receptions: number
    receptionTotal: number // Sum of reception values
    participation: number // % of events involving this player
}

interface ReceptionStats {
    total: number
    byRating: { [key: number]: number } // 0-4
    positivePercentage: number // % of 3-4 ratings
    byPlayer: { playerId: string; playerName: string; count: number; average: number }[]
}

interface SubstitutionInfo {
    playerOut: string
    playerIn: string
    setNumber: number
    timestamp: string
    position: number
}

interface TimeoutInfo {
    team: 'home' | 'away'
    setNumber: number
    timestamp: string
    scoreHome: number
    scoreAway: number
}

/**
 * Calculate match duration from events
 */
export function calculateMatchDuration(events: MatchEvent[]): string {
    if (events.length < 2) return '0m'

    const start = new Date(events[0].timestamp).getTime()
    const end = new Date(events[events.length - 1].timestamp).getTime()
    const diffMs = end - start

    const hrs = Math.floor(diffMs / (1000 * 60 * 60))
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`
}

/**
 * Calculate points by action type for both teams
 */
export function calculatePointsByType(events: MatchEvent[], ourSide: 'home' | 'away'): PointsByType {
    const stats: PointsByType = {
        home: { attack: 0, block: 0, serve: 0, opponentError: 0 },
        away: { attack: 0, block: 0, serve: 0, opponentError: 0 }
    }

    events.forEach(event => {
        if (event.type !== 'POINT_US' && event.type !== 'POINT_OPPONENT') return

        const isHomePoint = (event.type === 'POINT_US' && ourSide === 'home') ||
            (event.type === 'POINT_OPPONENT' && ourSide === 'away')
        const team = isHomePoint ? 'home' : 'away'
        const reason = event.payload?.reason?.toLowerCase() || ''

        if (reason.includes('attack') && !reason.includes('error')) {
            stats[team].attack++
        } else if (reason.includes('block')) {
            stats[team].block++
        } else if (reason.includes('service') || reason.includes('serve') && !reason.includes('error')) {
            stats[team].serve++
        } else if (reason.includes('error') || reason.includes('fault')) {
            stats[team].opponentError++
        } else {
            // Default: count as opponent error if we can't classify
            stats[team].opponentError++
        }
    })

    return stats
}

/**
 * Calculate per-player statistics
 */
export function calculatePlayerStats(
    events: MatchEvent[],
    players: Array<{ id: string; name: string }>,
    _ourSide: 'home' | 'away'
): PlayerStats[] {
    const playerMap = new Map<string, PlayerStats>()

    // Initialize all players
    players.forEach(p => {
        playerMap.set(p.id, {
            playerId: p.id,
            playerName: p.name,
            positiveActions: 0,
            negativeActions: 0,
            receptions: 0,
            receptionTotal: 0,
            participation: 0
        })
    })

    let totalEvents = 0

    events.forEach(event => {
        const playerId = event.payload?.playerId
        if (!playerId) return

        const stats = playerMap.get(playerId)
        if (!stats) return

        totalEvents++
        stats.participation++

        // Positive actions
        if (event.type === 'POINT_US') {
            stats.positiveActions++
        }

        // Negative actions (errors)
        if (event.type === 'POINT_OPPONENT' && event.payload?.reason?.toLowerCase().includes('error')) {
            stats.negativeActions++
        }

        // Receptions
        if (event.type === 'RECEPTION_EVAL' && event.payload?.reception) {
            stats.receptions++
            stats.receptionTotal += event.payload.reception.value
        }
    })

    // Calculate participation percentage
    if (totalEvents > 0) {
        playerMap.forEach(stats => {
            stats.participation = Math.round((stats.participation / totalEvents) * 100)
        })
    }

    return Array.from(playerMap.values()).filter(s => s.participation > 0)
}

/**
 * Calculate reception statistics
 */
export function calculateReceptionStats(
    events: MatchEvent[],
    players: Array<{ id: string; name: string }>
): ReceptionStats {
    const byRating: { [key: number]: number } = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 }
    const playerReceptions = new Map<string, { count: number; total: number; name: string }>()

    let total = 0
    let positiveCount = 0

    events.forEach(event => {
        if (event.type !== 'RECEPTION_EVAL' || !event.payload?.reception) return

        const rating = event.payload.reception.value
        const playerId = event.payload.reception.playerId

        byRating[rating] = (byRating[rating] || 0) + 1
        total++

        if (rating >= 3) positiveCount++

        // Track per player
        if (playerId) {
            if (!playerReceptions.has(playerId)) {
                const player = players.find(p => p.id === playerId)
                playerReceptions.set(playerId, {
                    count: 0,
                    total: 0,
                    name: player?.name || 'Unknown'
                })
            }
            const pr = playerReceptions.get(playerId)!
            pr.count++
            pr.total += rating
        }
    })

    const byPlayer = Array.from(playerReceptions.entries()).map(([playerId, data]) => ({
        playerId,
        playerName: data.name,
        count: data.count,
        average: data.count > 0 ? Math.round((data.total / data.count) * 10) / 10 : 0
    }))

    return {
        total,
        byRating,
        positivePercentage: total > 0 ? Math.round((positiveCount / total) * 100) : 0,
        byPlayer
    }
}

/**
 * Extract all substitutions from events
 */
export function extractSubstitutions(events: MatchEvent[]): SubstitutionInfo[] {
    return events
        .filter(e => e.type === 'SUBSTITUTION' && e.payload?.substitution)
        .map(e => ({
            playerOut: e.payload!.substitution!.playerOutId,
            playerIn: e.payload!.substitution!.playerInId,
            setNumber: e.payload!.substitution!.setNumber,
            timestamp: e.timestamp,
            position: e.payload!.substitution!.position
        }))
}

/**
 * Extract all timeouts from events
 */
export function extractTimeouts(events: MatchEvent[], ourSide: 'home' | 'away'): TimeoutInfo[] {
    const timeouts: TimeoutInfo[] = []

    let currentSetScores = { home: 0, away: 0 }
    let currentSet = 1

    events.forEach(event => {
        // Track set changes
        if (event.type === 'SET_START') {
            currentSetScores = { home: 0, away: 0 }
            if (event.payload?.setNumber) {
                currentSet = event.payload.setNumber
            }
        }

        // Track points
        if (event.type === 'POINT_US' || event.type === 'POINT_OPPONENT') {
            const isHomePoint = (event.type === 'POINT_US' && ourSide === 'home') ||
                (event.type === 'POINT_OPPONENT' && ourSide === 'away')
            if (isHomePoint) {
                currentSetScores.home++
            } else {
                currentSetScores.away++
            }
        }

        // Track timeouts
        if (event.type === 'TIMEOUT' && event.payload?.team) {
            timeouts.push({
                team: event.payload.team,
                setNumber: currentSet,
                timestamp: event.timestamp,
                scoreHome: currentSetScores.home,
                scoreAway: currentSetScores.away
            })
        }
    })

    return timeouts
}

/**
 * Calculate max scoring runs/streaks
 */
export function calculateMaxStreaks(events: MatchEvent[], ourSide: 'home' | 'away'): {
    homeMaxStreak: number
    awayMaxStreak: number
} {
    let currentHomeStreak = 0
    let maxHomeStreak = 0
    let currentAwayStreak = 0
    let maxAwayStreak = 0

    events.forEach(e => {
        if (e.type !== 'POINT_US' && e.type !== 'POINT_OPPONENT') return

        const isHomePoint = (e.type === 'POINT_US' && ourSide === 'home') ||
            (e.type === 'POINT_OPPONENT' && ourSide === 'away')
        const isAwayPoint = !isHomePoint

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

    return { homeMaxStreak: maxHomeStreak, awayMaxStreak: maxAwayStreak }
}
