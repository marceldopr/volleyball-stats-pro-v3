import { useEffect } from 'react'
import { toast } from 'sonner'
import type { DerivedMatchState, MatchEvent, PlayerV2 } from '@/stores/matchStoreV2'
import { matchServiceV2 } from '@/services/matchServiceV2'

export interface UseMatchEffectsV2Args {
    matchId: string | undefined
    loading: boolean
    availablePlayers: PlayerV2[]
    derivedState: DerivedMatchState
    events: MatchEvent[]
    navigate: (to: string) => void
}

/**
 * Centralized match effects hook
 * Handles validation guards, auto-save, and flow triggers
 */
export function useMatchEffectsV2({
    matchId,
    loading,
    availablePlayers,
    derivedState,
    events,
    navigate
}: UseMatchEffectsV2Args): void {

    // CRITICAL C5 VALIDATION: Prevent entering live match without convocated players
    // This prevents crashes in starters modal and rotation display
    useEffect(() => {
        // Only validate after loading is complete
        if (loading) return

        // Check if we have no players AND no lineup configured AND no events
        // The events.length check is CRITICAL: if match has events, it's in progress
        // and we should allow re-entry even if convocations aren't loaded yet
        if (availablePlayers.length === 0 && !derivedState.hasLineupForCurrentSet && events.length === 0) {
            console.error('⚠️ CRITICAL C5: Cannot enter live match without convocated players')
            console.error('  Match ID:', matchId)
            console.error('  Available players:', availablePlayers.length)
            console.error('  Events:', events.length)

            toast.error('No hay jugadoras convocadas. Configure la convocatoria primero.', {
                duration: 5000
            })

            // Redirect back to matches list where user can configure convocations
            navigate('/matches')
        }
    }, [loading, availablePlayers.length, derivedState.hasLineupForCurrentSet, events.length, matchId, navigate])

    // Auto-save match when finished
    useEffect(() => {
        if (!derivedState.isMatchFinished || !matchId) return

        const saveMatchToSupabase = async () => {
            try {
                // Prepare match result string
                const setsWon = `${derivedState.setsWonHome}-${derivedState.setsWonAway}`

                // Calculate individual set scores for detailed result
                const setScores = derivedState.setsScores
                    .map(s => `${s.home}-${s.away}`)
                    .join(', ')
                const detailedResult = `Sets: ${setsWon} (${setScores})`

                // Save to Supabase
                await matchServiceV2.updateMatchV2(matchId, {
                    actions: events,  // Save all events
                    status: 'finished',
                    result: detailedResult
                })

                console.log('✅ Match saved to Supabase successfully')
            } catch (error) {
                console.error('❌ Error saving match:', error)
            }
        }

        saveMatchToSupabase()
    }, [derivedState.isMatchFinished, matchId, events, derivedState.setsWonHome, derivedState.setsWonAway, derivedState.setsScores])
}
