import { MatchEvent, calculateDerivedState } from '@/stores/matchStoreV2'

export interface TimelineEntry {
    id: string
    setNumber: number
    team: 'us' | 'opponent' | 'neutral'
    type: 'point' | 'substitution' | 'libero' | 'set-start' | 'set-end' | 'reception' | 'freeball' | 'lineup'
    icon: string
    teamLabel: string
    description: string
    score?: { home: number; away: number }
    timestamp: string
}

// Map point reasons to readable text
const reasonMap: Record<string, string> = {
    'attack': 'ataque',
    'block': 'bloqueo',
    'serve': 'saque',
    'opponent_error': 'error rival',
    'reception_error': 'error recepción',
    'attack_error': 'error ataque',
    'service_error': 'error saque',
    'block_error': 'error bloqueo'
}

function reasonToText(reason?: string): string {
    if (!reason) return 'punto'
    return reasonMap[reason] || reason
}

// Calculate set number at a specific event index
function calculateSetNumberAtIndex(index: number, allEvents: MatchEvent[]): number {
    const eventsUpToNow = allEvents.slice(0, index + 1)
    const setStarts = eventsUpToNow.filter(e => e.type === 'SET_START')
    return setStarts.length || 1
}

// Calculate score at a specific event index
function calculateScoreAtIndex(
    index: number,
    allEvents: MatchEvent[],
    ourSide: 'home' | 'away'
): { home: number; away: number } {
    const eventsUpToNow = allEvents.slice(0, index + 1)

    // Use empty arrays for initialOnCourtPlayers and dismissedSetSummaries
    // We only care about the score
    const derived = calculateDerivedState(eventsUpToNow, ourSide, [], [])

    return {
        home: derived.homeScore,
        away: derived.awayScore
    }
}

// Format a single event into a timeline entry
export function formatTimelineEntry(
    event: MatchEvent,
    index: number,
    allEvents: MatchEvent[],
    ourSide: 'home' | 'away',
    homeTeamName: string | null,
    awayTeamName: string | null
): TimelineEntry {
    const setNumber = calculateSetNumberAtIndex(index, allEvents)
    const score = ['POINT_US', 'POINT_OPPONENT'].includes(event.type)
        ? calculateScoreAtIndex(index, allEvents, ourSide)
        : undefined

    const homeLabel = homeTeamName || 'Local'
    const awayLabel = awayTeamName || 'Visitante'
    const usLabel = ourSide === 'home' ? homeLabel : awayLabel
    const opponentLabel = ourSide === 'home' ? awayLabel : homeLabel

    switch (event.type) {
        case 'POINT_US':
            return {
                id: event.id,
                setNumber,
                team: 'us',
                type: 'point',
                icon: '⚡',
                teamLabel: usLabel,
                description: `Punto ${reasonToText(event.payload?.reason)}`,
                score,
                timestamp: event.timestamp
            }

        case 'POINT_OPPONENT':
            return {
                id: event.id,
                setNumber,
                team: 'opponent',
                type: 'point',
                icon: '⚡',
                teamLabel: opponentLabel,
                description: `Punto ${reasonToText(event.payload?.reason)}`,
                score,
                timestamp: event.timestamp
            }

        case 'SUBSTITUTION': {
            const sub = event.payload?.substitution
            if (sub?.isLiberoSwap) {
                // Líbero swap
                return {
                    id: event.id,
                    setNumber,
                    team: 'neutral',
                    type: 'libero',
                    icon: '🔄',
                    teamLabel: '',
                    description: `Cambio líbero`,
                    timestamp: event.timestamp
                }
            } else {
                // Regular substitution
                const playerIn = sub?.playerIn
                return {
                    id: event.id,
                    setNumber,
                    team: 'neutral',
                    type: 'substitution',
                    icon: '🔄',
                    teamLabel: '',
                    description: playerIn
                        ? `Sustitución: #${playerIn.number} ${playerIn.name}`
                        : 'Sustitución',
                    timestamp: event.timestamp
                }
            }
        }

        case 'SET_START':
            return {
                id: event.id,
                setNumber: event.payload?.setNumber || setNumber,
                team: 'neutral',
                type: 'set-start',
                icon: '🏐',
                teamLabel: '',
                description: `Inicio Set ${event.payload?.setNumber || setNumber}`,
                timestamp: event.timestamp
            }

        case 'SET_END': {
            const endScore = event.payload?.score
            return {
                id: event.id,
                setNumber: event.payload?.setNumber || setNumber,
                team: 'neutral',
                type: 'set-end',
                icon: '✅',
                teamLabel: '',
                description: endScore
                    ? `Fin Set ${event.payload?.setNumber || setNumber} (${endScore.home}-${endScore.away})`
                    : `Fin Set ${event.payload?.setNumber || setNumber}`,
                timestamp: event.timestamp
            }
        }

        case 'SET_LINEUP':
            return {
                id: event.id,
                setNumber,
                team: 'neutral',
                type: 'lineup',
                icon: '👥',
                teamLabel: '',
                description: `Alineación inicial Set ${setNumber}`,
                timestamp: event.timestamp
            }

        case 'RECEPTION_EVAL': {
            const reception = event.payload?.reception
            return {
                id: event.id,
                setNumber,
                team: 'us',
                type: 'reception',
                icon: '📊',
                teamLabel: '',
                description: `Recepción: ${reception?.value || 0}`,
                timestamp: event.timestamp
            }
        }

        case 'FREEBALL':
            return {
                id: event.id,
                setNumber,
                team: 'neutral',
                type: 'freeball',
                icon: '🎯',
                teamLabel: '',
                description: 'Freeball',
                timestamp: event.timestamp
            }

        default:
            return {
                id: event.id,
                setNumber,
                team: 'neutral',
                type: 'point',
                icon: '📋',
                teamLabel: '',
                description: event.type,
                timestamp: event.timestamp
            }
    }
}

// Format all events into timeline entries
export function formatTimeline(
    events: MatchEvent[],
    ourSide: 'home' | 'away',
    homeTeamName: string | null,
    awayTeamName: string | null
): TimelineEntry[] {
    return events.map((event, index) =>
        formatTimelineEntry(event, index, events, ourSide, homeTeamName, awayTeamName)
    )
}
