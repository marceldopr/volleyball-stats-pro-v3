import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { MatchEventType } from '@/stores/matchStoreV2'
import { useActionPlayerModal, ActionType, isPointUs, isPointOpponent } from './useActionPlayerModal'

interface UseActionCaptureV2Args {
    currentSet: number
    addEvent: (type: MatchEventType, payload: any) => void
}

interface UseActionCaptureV2Return {
    // State to disable buttons during processing
    isProcessing: boolean
    
    // Modal State
    isActionModalOpen: boolean
    currentActionType: ActionType | null
    
    // Action Handlers (Green/Red buttons)
    handlePointUs: (reason: string) => void
    handlePointOpponent: (reason: string) => void
    handleFreeballSent: () => void
    handleFreeballReceived: () => void
    
    // Modal Callbacks
    handleConfirmActionPlayer: (playerId: string) => void
    handleCancelActionPlayer: () => void
}

export function useActionCaptureV2({
    currentSet,
    addEvent
}: UseActionCaptureV2Args): UseActionCaptureV2Return {
    const [isProcessing, setIsProcessing] = useState(false)
    const actionModal = useActionPlayerModal()

    // --- Helper: Action wrapper with debounce ---
    const executeAction = useCallback((action: () => void) => {
        if (isProcessing) return
        setIsProcessing(true)
        try {
            action()
        } catch (error) {
            console.error('Error executing action:', error)
            toast.error('Error al ejecutar la acción')
        }
        // Small debounce to prevent double clicks
        setTimeout(() => {
            setIsProcessing(false)
        }, 200)
    }, [isProcessing])

    // --- Handlers: Main Action Buttons ---

    const handlePointUs = useCallback((reason: string) => {
        // "Error rival" (opponent_error) does NOT open modal - opponent made the error, not us
        // Logic copied from LiveMatchScoutingV2.tsx
        if (reason === 'opponent_error') {
            executeAction(() => addEvent('POINT_US', { reason }))
        } else {
            // All other our-point actions open modal for player selection
            // We do NOT use executeAction here because we are just opening a modal, not dispatching the final event yet
            // However, to keep consistency with "buttonsDisabled" logic, we might want to prevent opening if processing
            if (isProcessing) return 
            actionModal.openForAction(reason as ActionType)
        }
    }, [addEvent, executeAction, actionModal, isProcessing])

    const handlePointOpponent = useCallback((reason: string) => {
        // "Punto rival" (opponent_point) AND "Error genérico" (unforced_error) do NOT open modal - direct event
        if (reason === 'opponent_point' || reason === 'unforced_error') {
            executeAction(() => addEvent('POINT_OPPONENT', { reason }))
        } else {
            // All other opponent-scoring actions open modal
            if (isProcessing) return
            actionModal.openForAction(reason as ActionType)
        }
    }, [addEvent, executeAction, actionModal, isProcessing])

    const handleFreeballSent = useCallback(() => {
        // Freeball sent by us - no player modal needed
        executeAction(() => addEvent('FREEBALL_SENT', { setNumber: currentSet }))
    }, [addEvent, executeAction, currentSet])

    const handleFreeballReceived = useCallback(() => {
        // Freeball received from opponent - no player modal needed
        executeAction(() => addEvent('FREEBALL_RECEIVED', { setNumber: currentSet }))
    }, [addEvent, executeAction, currentSet])

    // --- Handlers: Modal Confirmation ---

    const handleConfirmActionPlayer = useCallback((playerId: string) => {
        const actionType = actionModal.actionType
        if (!actionType) return

        // Determine if this action gives us or opponent a point
        if (isPointUs(actionType)) {
            executeAction(() => addEvent('POINT_US', { reason: actionType, playerId }))
        } else if (isPointOpponent(actionType)) {
            executeAction(() => addEvent('POINT_OPPONENT', { reason: actionType, playerId }))
        } else if (actionType === 'freeball') {
            executeAction(() => addEvent('FREEBALL', { playerId }))
        }

        actionModal.close()
    }, [actionModal, executeAction, addEvent])

    const handleCancelActionPlayer = useCallback(() => {
        actionModal.close()
    }, [actionModal])

    return {
        isProcessing,
        
        isActionModalOpen: actionModal.isOpen,
        currentActionType: actionModal.actionType,
        
        handlePointUs,
        handlePointOpponent,
        handleFreeballSent,
        handleFreeballReceived,
        
        handleConfirmActionPlayer,
        handleCancelActionPlayer
    }
}
