import { useMemo } from 'react'
import type { MatchEventType } from '@/stores/matchStore'

export interface UseTimeoutsV2Args {
    currentSet: number
    timeoutsHome: number  // from derivedState
    timeoutsAway: number  // from derivedState  
    addEvent: (type: MatchEventType, payload?: any) => void
    isMatchFinished: boolean
}

export interface UseTimeoutsV2Return {
    // State
    homeTimeoutsUsed: number
    awayTimeoutsUsed: number

    // Can call checks
    canCallTimeoutHome: boolean
    canCallTimeoutAway: boolean

    // Actions
    callTimeoutHome: () => void
    callTimeoutAway: () => void
}

export function useTimeouts({
    currentSet,
    timeoutsHome,
    timeoutsAway,
    addEvent,
    isMatchFinished
}: UseTimeoutsV2Args): UseTimeoutsV2Return {

    // Can call checks: max 2 per team per set, and match not finished
    const canCallTimeoutHome = !isMatchFinished && timeoutsHome < 2
    const canCallTimeoutAway = !isMatchFinished && timeoutsAway < 2

    // Action handlers
    const callTimeoutHome = useMemo(() => () => {
        if (canCallTimeoutHome) {
            addEvent('TIMEOUT', { team: 'home', setNumber: currentSet })
        }
    }, [canCallTimeoutHome, addEvent, currentSet])

    const callTimeoutAway = useMemo(() => () => {
        if (canCallTimeoutAway) {
            addEvent('TIMEOUT', { team: 'away', setNumber: currentSet })
        }
    }, [canCallTimeoutAway, addEvent, currentSet])

    return {
        homeTimeoutsUsed: timeoutsHome,
        awayTimeoutsUsed: timeoutsAway,
        canCallTimeoutHome,
        canCallTimeoutAway,
        callTimeoutHome,
        callTimeoutAway
    }
}
