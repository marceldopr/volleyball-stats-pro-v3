import { useState, useEffect, useRef } from 'react'
import { NavigateFunction } from 'react-router-dom'
import { toast } from 'sonner'
import { useMatchStore, DerivedMatchState, MatchEvent } from '@/stores/matchStore'
import { matchService } from '@/services/matchService'

// Interface for the arguments the hook needs
export interface UseMatchModalsManagerV2Args {
    matchId: string | undefined
    derivedState: DerivedMatchState
    events: MatchEvent[]
    navigate: NavigateFunction
    // Store actions needed by handlers
    undoEvent: () => void
    closeSetSummaryModal: () => void
    // Existing individual modal hooks
    startersModal: any
    substitutionModal: any
    receptionModal: any
}

// Interface for the return value
export interface MatchModalsState {
    showRotationModal: boolean
    exitModalOpen: boolean
    isMatchFinishedModalOpen: boolean
    // Re-exporting existing modal states for convenience/unification
    showStartersModal: boolean
    showSubstitutionModal: boolean
    showReceptionModal: boolean
    isSetSummaryOpen: boolean
}

export interface MatchModalsHandlers {
    // Rotation
    openRotation: () => void
    closeRotation: () => void
    // Exit
    openExit: () => void
    closeExit: () => void
    handleSaveAndExit: () => Promise<void>
    handleExitWithoutSaving: () => void
    // Match Finished
    closeMatchFinished: () => void // Usually just closing navigation handles this
    // Set Summary
    handleCloseSetSummary: () => void
    handleConfirmSetSummary: () => Promise<void>
    handleUndoSetSummary: () => void
    // Starters Navigation
    handleBackFromStarters: () => void
}

export function useMatchModalsManager({
    matchId,
    derivedState,
    events,
    navigate,
    undoEvent,
    closeSetSummaryModal,
    startersModal,
    substitutionModal,
    receptionModal
}: UseMatchModalsManagerV2Args) {

    // --- Local State for Modals that don't have their own hooks ---
    const [showRotationModal, setShowRotationModal] = useState(false)
    const [exitModalOpen, setExitModalOpen] = useState(false)
    const [isMatchFinishedModalOpen, setIsMatchFinishedModalOpen] = useState(false)

    // Logic for Match Finished Modal auto-opening
    const hasShownFinishModal = useRef(false)

    useEffect(() => {
        if (derivedState.isMatchFinished && !hasShownFinishModal.current && !derivedState.setSummaryModalOpen) {
            setIsMatchFinishedModalOpen(true)
            hasShownFinishModal.current = true
        } else if (!derivedState.isMatchFinished) {
            // Reset if undone
            hasShownFinishModal.current = false
            setIsMatchFinishedModalOpen(false)
        }
    }, [derivedState.isMatchFinished, derivedState.setSummaryModalOpen])

    // --- Helper: saveMatchState ---
    // Extracted from original file
    const saveMatchState = async () => {
        if (!matchId) return

        try {
            // Prepare match result string
            const setsWon = `${derivedState.setsWonHome}-${derivedState.setsWonAway}`
            const setScores = derivedState.setsScores
                .map(s => `${s.home}-${s.away}`)
                .join(', ')
            const detailedResult = `Sets: ${setsWon} (${setScores})`

            // Save to Supabase with current status
            await matchService.updateMatch(matchId, {
                actions: events,
                status: derivedState.isMatchFinished ? 'finished' : 'in_progress',
                result: detailedResult
            })
        } catch (error) {
            console.error('❌ Error saving intermediate match state:', error)
        }
    }

    // --- Handlers: Set Summary ---
    const handleCloseSetSummary = () => {
        closeSetSummaryModal()

        // After closing set summary, check if we need to open starters modal
        setTimeout(() => {
            if (!derivedState.hasLineupForCurrentSet) {
                startersModal.openModal()
            }
        }, 100)
    }

    const handleConfirmSetSummary = async () => {
        // Confirm just means closing the modal and effectively "accepting" the set end state
        // CRITICAL: Save state to Supabase and WAIT for completion before proceeding
        await saveMatchState()

        closeSetSummaryModal()

        // After confirming set summary, check if we need to open starters modal
        setTimeout(() => {
            if (!derivedState.hasLineupForCurrentSet) {
                startersModal.openModal()
            }
        }, 100)
    }

    const handleUndoSetSummary = () => {
        closeSetSummaryModal()
        // Smart undo: Remove SET_START (if exists), SET_END, and the Point that caused it.
        // We Use the injected props 'events' and 'undoEvent' directly.

        const lastEvt = events[events.length - 1]

        if (lastEvt?.type === 'SET_START') {
            undoEvent() // Undo SET_START
            undoEvent() // Undo SET_END
            undoEvent() // Undo the Point that caused end
        } else if (lastEvt?.type === 'SET_END') {
            undoEvent() // Undo SET_END
            undoEvent() // Undo the Point
        } else {
            undoEvent()
        }
    }

    // --- Handlers: Exit Modal ---
    const handleSaveAndExit = async () => {
        if (!matchId) return

        setExitModalOpen(false)

        try {
            // Save current match state
            const setsWon = `${derivedState.setsWonHome}-${derivedState.setsWonAway}`
            const setScores = derivedState.setsScores
                .map(s => `${s.home}-${s.away}`)
                .join(', ')
            const detailedResult = `Sets: ${setsWon} (${setScores})`

            await matchService.updateMatch(matchId, {
                actions: events,
                status: derivedState.isMatchFinished ? 'finished' : 'in_progress',
                result: detailedResult
            })

            toast.success('Partido guardado')
            navigate('/matches')
        } catch (error) {
            console.error('Error saving match:', error)
            toast.error('Error al guardar')
            setExitModalOpen(true)
        }
    }

    const handleExitWithoutSaving = () => {
        setExitModalOpen(false)
        navigate('/matches')
    }

    // --- Handlers: Starters Navigation ---
    const handleBackFromStarters = () => {
        const currentSet = derivedState.currentSet

        // Clear any partial selections
        startersModal.resetModal()

        if (currentSet === 1) {
            // Set 1: Just close the modal, return to previous screen
            startersModal.closeModal()
        } else {
            // Sets 2-5: Close starters modal and reopen set summary
            startersModal.closeModal()

            // Reopen the set summary modal via store's closeSetSummaryModal mechanism
            // Since we want to OPEN it, we need to set the flag directly
            // Original code: useMatchStore.getState().derivedState.setSummaryModalOpen = true
            // This is a direct mutation of derivedState which is usually read-only/computed? 
            // Actually in Zustand it might be mutable if not using a reducer pattern strictly, 
            // but `derivedState` is usually computed. 
            // Let's look at the store definition... derivedState is computed by calculateDerivedState.
            // However, the `setSummaryModalOpen` is part of derivedState but might be managed/overridden?
            // Wait, looking at store code (from memory/context):
            // The store has `closeSetSummaryModal` which sets `dismissedSetSummaries`.
            // To "re-open", we might need to remove it from `dismissedSetSummaries`.
            // But the original code effectively did:
            // `const store = useMatchStore.getState()`
            // `store.derivedState.setSummaryModalOpen = true`
            // If derivedState is re-calculated on every event, this manual setting might be lost on next event.
            // But if no event happened, it might stick for UI rendering.
            // A better way would be if the store had `openSetSummaryModal`.
            // For now, I will replicate the original behavior strictly.
            const store = useMatchStore.getState()
            // @ts-ignore - Direct mutation legacy support
            store.derivedState.setSummaryModalOpen = true
            // Only force update if needed, but React should pick up if we use the hook. 
            // Since we are inside a hook, we can't force the component to re-render easily unless we use a setter.
            // But the original code did this.
            useMatchStore.setState({ derivedState: { ...store.derivedState, setSummaryModalOpen: true } })
        }
    }


    return {
        modals: {
            showRotationModal,
            exitModalOpen,
            isMatchFinishedModalOpen,
            showStartersModal: startersModal.showStartersModal,
            showSubstitutionModal: substitutionModal.showSubstitutionModal,
            showReceptionModal: receptionModal.showReceptionModal,
            isSetSummaryOpen: derivedState.setSummaryModalOpen
        },
        handlers: {
            openRotation: () => setShowRotationModal(true),
            closeRotation: () => setShowRotationModal(false),
            openExit: () => setExitModalOpen(true),
            closeExit: () => setExitModalOpen(false),
            handleSaveAndExit,
            handleExitWithoutSaving,
            closeMatchFinished: () => setIsMatchFinishedModalOpen(false),
            handleCloseSetSummary,
            handleConfirmSetSummary,
            handleUndoSetSummary,
            handleBackFromStarters
        }
    }
}
