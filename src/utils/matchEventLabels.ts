import type { MatchEvent, PlayerV2 } from '@/stores/matchStore'

// Event type labels in Spanish
export const eventTypeLabels: Record<string, string> = {
    'POINT_US': 'Punto',
    'POINT_OPPONENT': 'Punto rival',
    'SUBSTITUTION': 'Cambio',
    'SET_LINEUP': 'Alineación',
    'SET_START': 'Inicio set',
    'SET_END': 'Fin set',
    'RECEPTION_EVAL': 'Recepción',
    'FREEBALL': 'Freeball',
    'FREEBALL_SENT': 'Freeball env.',
    'FREEBALL_RECEIVED': 'Freeball rec.',
    'TIMEOUT': 'Tiempo muerto',
    'SET_SERVICE_CHOICE': 'Saque inicial',
}

// Event reason labels in Spanish
export const eventReasonLabels: Record<string, string> = {
    // Point reasons (our points)
    'serve_point': 'Punto saque',
    'attack_point': 'Punto ataque',
    'block_point': 'Punto bloqueo',
    'opponent_error': 'Error rival',
    // Point reasons (opponent points / our errors)
    'service_error': 'Error saque',
    'attack_error': 'Error ataque',
    'attack_blocked': 'Bloqueado',
    'unforced_error': 'Error genérico',
    'fault': 'Falta',
    'reception_error': 'Error recepción',
    'opponent_point': 'Punto rival',
}

/**
 * Get a short label for the last event, showing player number if available
 * @param event - The last event
 * @param playersById - Map of player IDs to player objects
 * @returns Short label like "#12 Punto ataque" or "Punto rival"
 */
export function getLastEventLabel(
    event: MatchEvent | undefined,
    playersById: Map<string, PlayerV2>
): string {
    if (!event) return 'Historial'

    // Get player number if playerId exists
    let playerPrefix = ''
    const playerId = event.payload?.playerId
    if (playerId) {
        const player = playersById.get(playerId)
        if (player?.number) {
            playerPrefix = `#${player.number} `
        } else if (player?.name) {
            playerPrefix = `${player.name.split(' ')[0]} `
        }
    }

    // Handle reception specially (has different structure)
    if (event.type === 'RECEPTION_EVAL' && event.payload?.reception) {
        const recPlayerId = event.payload.reception.playerId
        const recPlayer = playersById.get(recPlayerId)
        const recValue = event.payload.reception.value
        if (recPlayer?.number) {
            return `#${recPlayer.number} Recepción ${recValue}`
        }
        return `Recepción ${recValue}`
    }

    // Handle substitution specially
    if (event.type === 'SUBSTITUTION' && event.payload?.substitution) {
        const sub = event.payload.substitution
        if (sub.isLiberoSwap) {
            return 'Cambio líbero'
        }
        const playerIn = sub.playerIn
        if (playerIn?.number) {
            return `#${playerIn.number} Entra`
        }
        return 'Cambio'
    }

    // Get action label from reason or type
    const reason = event.payload?.reason
    let actionLabel = reason && eventReasonLabels[reason]
        ? eventReasonLabels[reason]
        : eventTypeLabels[event.type] || event.type

    return `${playerPrefix}${actionLabel}`
}
