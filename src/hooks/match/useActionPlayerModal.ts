import { useState, useCallback } from 'react'

export type ActionType =
    | 'serve_point' | 'service_error'
    | 'attack_point' | 'attack_error'
    | 'block_point' | 'attack_blocked'
    | 'opponent_error' | 'freeball'

interface UseActionPlayerModalReturn {
    isOpen: boolean
    actionType: ActionType | null
    openForAction: (action: ActionType) => void
    close: () => void
}

export function useActionPlayerModal(): UseActionPlayerModalReturn {
    const [isOpen, setIsOpen] = useState(false)
    const [actionType, setActionType] = useState<ActionType | null>(null)

    const openForAction = useCallback((action: ActionType) => {
        setActionType(action)
        setIsOpen(true)
    }, [])

    const close = useCallback(() => {
        setIsOpen(false)
        setActionType(null)
    }, [])

    return {
        isOpen,
        actionType,
        openForAction,
        close
    }
}

// Helper to get display title for each action type
export function getActionTitle(actionType: ActionType | null): string {
    switch (actionType) {
        case 'serve_point':
            return 'Punto de saque'
        case 'service_error':
            return 'Error de saque'
        case 'attack_point':
            return 'Punto de ataque'
        case 'attack_error':
            return 'Error de ataque'
        case 'block_point':
            return 'Punto de bloqueo'
        case 'attack_blocked':
            return 'Bloqueado'
        case 'opponent_error':
            return 'Error del rival'
        case 'freeball':
            return 'Freeball'
        default:
            return 'Acción'
    }
}

// Helper to determine if action gives us a point or opponent
export function isPointUs(actionType: ActionType | null): boolean {
    return actionType === 'serve_point'
        || actionType === 'attack_point'
        || actionType === 'block_point'
        || actionType === 'opponent_error'
}

export function isPointOpponent(actionType: ActionType | null): boolean {
    return actionType === 'service_error'
        || actionType === 'attack_error'
        || actionType === 'attack_blocked'
}
