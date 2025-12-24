import type { PlayerV2 } from '@/stores/matchStore'

/**
 * Formats a player's name preferring the First Surname + Initial strategy.
 * 
 * Rules:
 * 1. Nickname (if present) -> "Nickname"
 * 2. Structured Name (First + Last) -> "First S." (where S is the first part of last name)
 * 3. Fallback string split -> "First S1." (tries to identify first surname in "First S1 S2")
 */
export function formatPlayerName(player: PlayerV2 | undefined | null, fallbackName: string): string {
    if (!player) {
        return formatNameString(fallbackName)
    }

    // Guard: fallback if player exists but has no name fields?
    if (!player.name && !player.nickname && !player.firstName && !player.lastName) {
        return formatNameString(fallbackName || '')
    }

    // 1. Nickname has priority
    if (player.nickname) return player.nickname

    // 2. Structured Name (First Name + First Surname Initial)
    if (player.firstName && player.lastName) {
        // Take the FIRST part of the last name (First Surname)
        const firstSurname = player.lastName.trim().split(/\s+/)[0]
        return `${player.firstName} ${firstSurname[0]}.`
    }

    // 3. Fallback to splitting full name string (legacy behavior)
    return formatNameString(player.name || fallbackName)
}

function formatNameString(fullName: string | null | undefined): string {
    if (!fullName) return ''
    const parts = fullName.trim().split(/\s+/)
    if (parts.length === 1) return parts[0]

    // Fallback heuristic: Try to grab the second-to-last part if length > 2
    // "Maria Garcia Perez" -> "Maria G." (Garcia is parts[1])
    // "Maria Jose Garcia" -> "Maria J." (Jose is parts[1]) -> Imperfect but better than "Garcia" which is first name part

    const firstName = parts[0]
    // If 3+ parts (First S1 S2), take S1 (second to last)
    // If 2 parts (First S1), take S1 (last)
    const surnamePart = parts.length > 2 ? parts[parts.length - 2] : parts[parts.length - 1]

    return `${firstName} ${surnamePart[0]}.`
}
