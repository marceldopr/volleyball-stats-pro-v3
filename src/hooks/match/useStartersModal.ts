import { useState, useEffect, useRef } from 'react'
import type { DerivedMatchState } from '@/stores/matchStoreV2'

interface UseStartersModalProps {
    derivedState: DerivedMatchState
    loading: boolean
}

/**
 * Hook para manejar el estado y lógica del modal de titulares
 * Extrae la lógica de apertura automática del modal al inicio de cada set
 * Líneas originales: 53-56, 64, 224-277 en LiveMatchScoutingV2.tsx
 */
export function useStartersModal({ derivedState, loading }: UseStartersModalProps) {
    const [showStartersModal, setShowStartersModal] = useState(false)
    const [initialServerChoice, setInitialServerChoice] = useState<'our' | 'opponent' | null>(null)
    const [selectedStarters, setSelectedStarters] = useState<{ [pos: number]: string }>({})
    const [selectedLiberoId, setSelectedLiberoId] = useState<string | null>(null)

    const lastSetRef = useRef<number | null>(null)

    // --- Strict Effect: Only Open Modal on Set Change if No Lineup ---
    // Original: líneas 224-266
    useEffect(() => {
        if (!derivedState.currentSet) return

        // Check if set has changed
        if (lastSetRef.current !== derivedState.currentSet) {
            lastSetRef.current = derivedState.currentSet

            // Do NOT open starters modal if set summary modal is currently open
            if (derivedState.setSummaryModalOpen) {
                return
            }

            // Only open if NO lineup exists for this new set
            if (!derivedState.hasLineupForCurrentSet) {
                setShowStartersModal(true)
            } else {
                setShowStartersModal(false)
            }
        }
        // Initial load check
        else if (lastSetRef.current === derivedState.currentSet && !derivedState.hasLineupForCurrentSet && !showStartersModal) {
            // If we are on the current set, have no lineup, and modal is closed... 
            // This might be redundant if the initial load handled it, but safety for "mid-set" with no lineup.
            // Actually user asked for specific logic: "Al empezar el set 1: Si no hay lineup → se muestra el modal".
            // "Cuando se cierra el set 1 y se genera SET_START del set 2: ... modal".

            // CRITICAL: Also check for set summary modal here
            if (!derivedState.setSummaryModalOpen) {
                // Can open starters modal safely
            }
        }
    }, [derivedState.currentSet, derivedState.hasLineupForCurrentSet, derivedState.setSummaryModalOpen, showStartersModal])

    // Initial mount check for reload scenarios
    // Original: líneas 268-277
    useEffect(() => {
        if (loading) return
        // If we load the page, have no lineup, we must ensure modal opens
        if (derivedState.currentSet && !derivedState.hasLineupForCurrentSet) {
            // Only if we haven't tracked this set yet or just need to force it
            setShowStartersModal(true)
            lastSetRef.current = derivedState.currentSet
        }
    }, [loading, derivedState.currentSet, derivedState.hasLineupForCurrentSet])

    const resetModal = () => {
        setSelectedStarters({})
        setSelectedLiberoId(null)
        setInitialServerChoice(null)
    }

    const openModal = () => setShowStartersModal(true)
    const closeModal = () => {
        setShowStartersModal(false)
        resetModal()
    }

    return {
        // State
        showStartersModal,
        initialServerChoice,
        selectedStarters,
        selectedLiberoId,

        // Setters
        setShowStartersModal,
        setInitialServerChoice,
        setSelectedStarters,
        setSelectedLiberoId,

        // Actions
        openModal,
        closeModal,
        resetModal
    }
}
