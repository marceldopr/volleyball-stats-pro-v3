import { PlayerV2 } from '@/stores/matchStore'

/**
 * Determina si una jugadora es líbero basado en su rol
 */
export function isLibero(player: PlayerV2 | undefined | null): boolean {
    if (!player) return false
    const role = player.role?.toUpperCase()
    return role === 'L' || role === 'LIBERO' || role === 'LÍBERO'
}

/**
 * Valida que una sustitución sea válida (mismo tipo de rol)
 * Solo permite campo↔campo o líbero↔líbero
 */
export function isValidSubstitution(playerOut: PlayerV2, playerIn: PlayerV2): boolean {
    const outIsLibero = isLibero(playerOut)
    const inIsLibero = isLibero(playerIn)

    // Solo permitir campo↔campo o líbero↔líbero
    return (outIsLibero && inIsLibero) || (!outIsLibero && !inIsLibero)
}
