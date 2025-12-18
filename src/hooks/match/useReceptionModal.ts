import { useState, useEffect } from 'react'
import type { DerivedMatchState } from '@/stores/matchStore'

interface UseReceptionModalProps {
    derivedState: DerivedMatchState
    showSubstitutionModal: boolean
    showStartersModal: boolean
}

/**
 * Hook para manejar el estado y lógica del modal de recepción
 * Extrae la lógica de apertura automática del modal cuando el equipo está recibiendo
 * Líneas originales: 42-43, 279-304 en LiveMatchScoutingV2.tsx
 */
export function useReceptionModal({
    derivedState,
    showSubstitutionModal,
    showStartersModal
}: UseReceptionModalProps) {
    const [showReceptionModal, setShowReceptionModal] = useState(false)
    const [hasReceptionThisRally, setHasReceptionThisRally] = useState(false)

    // Reset hasReceptionThisRally when score changes (new rally) or when we switch to receiving
    // Original: líneas 279-285
    useEffect(() => {
        // Reset flag on new rally (score change) while we're receiving
        if (derivedState.servingSide === 'opponent') {
            setHasReceptionThisRally(false)
        }
    }, [derivedState.servingSide, derivedState.homeScore, derivedState.awayScore])

    // Show reception modal immediately when we start receiving
    // Original: líneas 287-304
    useEffect(() => {
        // Only show if we're receiving, set is not finished, have lineup, and haven't evaluated this rally yet
        // CRITICAL: Don't show if starters modal is open (priority)
        if (derivedState.servingSide === 'opponent' &&
            !derivedState.isSetFinished &&
            derivedState.hasLineupForCurrentSet &&
            !hasReceptionThisRally &&
            !derivedState.setSummaryModalOpen &&
            !showSubstitutionModal &&
            !showStartersModal) {
            const timer = setTimeout(() => {
                setShowReceptionModal(true)
            }, 200)

            return () => clearTimeout(timer)
        }
    }, [derivedState.servingSide, derivedState.isSetFinished, derivedState.hasLineupForCurrentSet, hasReceptionThisRally, derivedState.setSummaryModalOpen, showSubstitutionModal, showStartersModal])

    const markReceptionCompleted = () => {
        setHasReceptionThisRally(true)
        setShowReceptionModal(false)
    }

    return {
        showReceptionModal,
        setShowReceptionModal,
        hasReceptionThisRally,
        markReceptionCompleted
    }
}
