/**
 * useLiveMatchHandlers.ts
 * 
 * Hook that centralizes all match action handlers.
 * Extracted from LiveMatchScouting.tsx for better separation of concerns.
 * 
 * Contains NO JSX - only handler logic.
 */

import { toast } from 'sonner'
import { validateFIVBSubstitution, DerivedMatchState, MatchEventType, PlayerV2 } from '@/stores/matchStore'
import { isLibero, isValidSubstitution } from '@/lib/volleyball/substitutionHelpers'

interface StartersModalState {
    initialServerChoice: 'our' | 'opponent' | null
    selectedStarters: Record<number, string>
    selectedLiberoId: string | null
    setInitialServerChoice: (choice: 'our' | 'opponent' | null) => void
    setSelectedStarters: (fn: (prev: Record<number, string>) => Record<number, string>) => void
    setSelectedLiberoId: (id: string | null) => void
    closeModal: () => void
}

interface SubstitutionModalState {
    closeModal: () => void
}

interface ReceptionModalState {
    setShowReceptionModal: (show: boolean) => void
    markReceptionCompleted: () => void
}

interface UseLiveMatchHandlersProps {
    derivedState: DerivedMatchState
    availablePlayers: PlayerV2[]
    addEvent: (type: MatchEventType, payload?: any) => Promise<void>
    addReceptionEval: (playerId: string, rating: 0 | 1 | 2 | 3 | 4) => void
    startersModal: StartersModalState
    substitutionModal: SubstitutionModalState
    receptionModal: ReceptionModalState
    setShowSubstitutionModal: (show: boolean) => void
}

export function useLiveMatchHandlers({
    derivedState,
    availablePlayers,
    addEvent,
    addReceptionEval,
    startersModal,
    substitutionModal,
    receptionModal,
    setShowSubstitutionModal
}: UseLiveMatchHandlersProps) {

    /**
     * Handler: Confirm Starters Selection
     * Called when user confirms the starting lineup for a set
     */
    const handleConfirmStarters = () => {
        // Validation for Set 1 & 5
        const needsServeChoice = derivedState.currentSet === 1 || derivedState.currentSet === 5
        if (needsServeChoice && !startersModal.initialServerChoice) return

        const lineup = [1, 2, 3, 4, 5, 6].map(pos => {
            const playerId = startersModal.selectedStarters[pos]
            const player = availablePlayers.find(p => p.id === playerId)
            return {
                position: pos as 1 | 2 | 3 | 4 | 5 | 6,
                playerId,
                player: player!
            }
        })

        // Dispatch Service Choice if needed
        if (needsServeChoice && startersModal.initialServerChoice) {
            addEvent('SET_SERVICE_CHOICE', {
                setNumber: derivedState.currentSet,
                initialServingSide: startersModal.initialServerChoice
            })
        }

        addEvent('SET_LINEUP', {
            setNumber: derivedState.currentSet,
            lineup: lineup as any,
            liberoId: startersModal.selectedLiberoId
        })

        // Close modal
        startersModal.closeModal()
    }

    /**
     * Handler: Confirm Substitution
     * Called when user confirms a player substitution
     */
    const handleConfirmSubstitution = ({ playerOutId, playerInId, position }: {
        playerOutId: string
        playerInId: string
        position: 1 | 2 | 3 | 4 | 5 | 6
    }) => {
        // Find full player objects
        const playerOut = availablePlayers.find(p => p.id === playerOutId)
        const playerIn = availablePlayers.find(p => p.id === playerInId)

        if (!playerIn || !playerOut) {
            toast.error('Jugadora no encontrada')
            return
        }

        // Role validation
        if (!isValidSubstitution(playerOut, playerIn)) {
            toast.error('Sustitución no válida: los cambios deben ser campo por campo o líbero por líbero')
            return
        }

        // Determine if it's libero↔libero swap
        const isLiberoSwap = isLibero(playerOut) && isLibero(playerIn)

        // FIVB validation for field substitutions
        if (!isLiberoSwap) {
            const validation = validateFIVBSubstitution(
                derivedState.currentSetSubstitutions,
                playerOutId,
                playerInId,
                derivedState.onCourtPlayers
            )

            if (!validation.valid) {
                toast.error(validation.reason || 'Sustitución no válida según reglas FIVB')
                return
            }
        }

        // Dispatch substitution event
        addEvent('SUBSTITUTION', {
            substitution: {
                playerOutId,
                playerInId,
                position,
                setNumber: derivedState.currentSet,
                playerIn: playerIn,
                isLiberoSwap: isLiberoSwap
            }
        })

        // Close modal
        substitutionModal.closeModal()
        toast.success(`Cambio: ${playerIn.name} entra`)
    }

    /**
     * Handler: Instant Libero Swap
     * Called when user wants to swap between liberos
     */
    const handleInstantLiberoSwap = () => {
        // Verify lineup exists and set not finished
        if (!derivedState.hasLineupForCurrentSet || derivedState.isSetFinished || derivedState.isMatchFinished) {
            toast.error('No se puede cambiar el líbero en este momento')
            return
        }

        const currentLiberoId = derivedState.currentLiberoId

        // Find all liberos in the team
        const allLiberos = availablePlayers.filter(p => {
            const role = p.role?.toUpperCase()
            return role === 'L' || role === 'LIBERO' || role === 'LÍBERO'
        })

        // Filter available liberos (not the current one)
        const availableLiberos = allLiberos.filter(p => p.id !== currentLiberoId)

        if (availableLiberos.length === 0) {
            toast.info('Solo hay un líbero disponible')
            return
        }

        // Select next libero
        const nextLibero = availableLiberos[0]
        const currentLibero = allLiberos.find(p => p.id === currentLiberoId)

        if (!currentLibero || !nextLibero) {
            toast.error('Error al cambiar líbero')
            return
        }

        // Dispatch libero↔libero substitution event
        addEvent('SUBSTITUTION', {
            substitution: {
                playerOutId: currentLiberoId,
                playerInId: nextLibero.id,
                position: 0 as any, // Special position for libero
                setNumber: derivedState.currentSet,
                playerIn: nextLibero,
                isLiberoSwap: true
            }
        })
        toast.success(`Líbero: ${nextLibero.name} entra`)
    }

    /**
     * Handler: Timeout from Reception Modal
     * Does NOT close reception modal
     */
    const handleTimeoutFromReception = (team: 'home' | 'away') => {
        addEvent('TIMEOUT', { team, setNumber: derivedState.currentSet })
        toast.success(`Tiempo muerto: ${team === derivedState.ourSide ? 'Nuestro equipo' : 'Rival'}`)
    }

    /**
     * Handler: Open Substitution from Reception Modal
     * Closes reception, opens substitution modal
     */
    const handleSubstitutionFromReception = () => {
        receptionModal.setShowReceptionModal(false)
        setShowSubstitutionModal(true)
    }

    /**
     * Handler: Reception Evaluation
     * Called when user rates a reception
     */
    const handleReceptionEval = (playerId: string, rating: 0 | 1 | 2 | 3 | 4) => {
        addReceptionEval(playerId, rating)
        receptionModal.markReceptionCompleted()

        // If rating is 0 (direct error), award point to opponent
        if (rating === 0) {
            setTimeout(() => {
                addEvent('POINT_OPPONENT', { reason: 'reception_error' })
            }, 100)
        }
    }

    return {
        handleConfirmStarters,
        handleConfirmSubstitution,
        handleInstantLiberoSwap,
        handleTimeoutFromReception,
        handleSubstitutionFromReception,
        handleReceptionEval
    }
}
