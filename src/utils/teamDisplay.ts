/**
 * Get the display name for a team without the club name.
 * 
 * Format: {Category} {Suffix} {Gender}
 * 
 * Suffix priority:
 * 1. custom_name (if set) - e.g., "A", "Taronja", "2"
 * 2. identifier name/code from DB - e.g., "A", "Taronja"
 * 3. (none)
 * 
 * Examples:
 * - custom_name "Taronja": "Cadete Taronja Femenino"
 * - identifier "A" (letter): "Cadete A Femenino"
 * - identifier "Taronja" (color): "Cadete Taronja Femenino"
 * - no suffix: "Cadete Femenino"
 * 
 * @param team - The team object with optional embedded identifier
 * @returns The formatted display name
 */
export function getTeamDisplayName(team: {
    category_stage?: string
    category?: string  // Legacy fallback
    custom_name?: string | null
    gender?: string
    identifier?: {
        name: string
        type: 'letter' | 'color'
        code: string | null
    } | null
}): string {
    const genderMap: Record<string, string> = {
        'male': 'Masculino',
        'female': 'Femenino',
        'mixed': 'Mixto'
    }
    const genderDisplay = team.gender ? (genderMap[team.gender] || team.gender) : undefined

    // Determine suffix: custom_name has priority, then identifier
    let suffix: string | undefined = undefined

    if (team.custom_name && team.custom_name.trim()) {
        suffix = team.custom_name.trim()
    } else if (team.identifier) {
        // For letters: use code if available, otherwise name
        // For colors: use name
        suffix = team.identifier.type === 'letter' && team.identifier.code
            ? team.identifier.code
            : team.identifier.name
    }

    // Use category_stage, fallback to category if needed
    const categoryDisplay = team.category_stage || team.category

    // Always include category first (if available)
    return [
        categoryDisplay,
        suffix,
        genderDisplay
    ]
        .filter(Boolean)
        .join(' ') || 'Sin nombre'  // Fallback if all fields are empty
}

/**
 * Get the short display name for a team (without gender).
 * 
 * Format: {Category} {Suffix}
 * 
 * Suffix priority:
 * 1. custom_name (if set)
 * 2. identifier name/code
 * 3. (none)
 * 
 * @param team - The team object
 * @returns The formatted short display name
 */
export function getTeamShortDisplayName(team: {
    category_stage?: string
    custom_name?: string | null
    identifier?: {
        name: string
        type: 'letter' | 'color'
        code: string | null
    } | null
}): string {
    // Determine suffix: custom_name has priority, then identifier
    let suffix: string | undefined = undefined

    if (team.custom_name && team.custom_name.trim()) {
        suffix = team.custom_name.trim()
    } else if (team.identifier) {
        suffix = team.identifier.type === 'letter' && team.identifier.code
            ? team.identifier.code
            : team.identifier.name
    }

    // Always include category_stage first
    return [
        team.category_stage,
        suffix
    ]
        .filter(Boolean)
        .join(' ')
}

