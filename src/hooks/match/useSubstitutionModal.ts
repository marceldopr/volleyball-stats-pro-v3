import { useState } from 'react'

/**
 * Hook para manejar el estado del modal de sustituciones
 * Extrae la lógica del modal de sustitución de LiveMatchScoutingV2
 */
export function useSubstitutionModal() {
    const [showSubstitutionModal, setShowSubstitutionModal] = useState(false)

    const openModal = () => setShowSubstitutionModal(true)
    const closeModal = () => setShowSubstitutionModal(false)

    return {
        showSubstitutionModal,
        setShowSubstitutionModal,
        openModal,
        closeModal
    }
}
