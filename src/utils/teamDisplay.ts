/**
 * Get the display name for a team without the club name.
 * Format: "Category Identifier Gender"
 * 
 * Examples:
 * - "Cadet Verd Masculí"
 * - "Sènior Taronja Femení"
 * - "Infantil B Masculí"
 * 
 * @param team - The team object
 * @returns The formatted display name
 */
export function getTeamDisplayName(team: {
    category_stage?: string
    team_suffix?: string | null
    gender?: string
}): string {
    const parts: string[] = []

    // Add category (e.g., "Cadet", "Sènior")
    if (team.category_stage) {
        parts.push(team.category_stage)
    }

    // Add identifier/suffix (e.g., "Verd", "A", "B")
    if (team.team_suffix) {
        parts.push(team.team_suffix)
    }

    // Add gender (e.g., "Masculí", "Femení")
    if (team.gender) {
        const genderMap: Record<string, string> = {
            'male': 'Masculí',
            'female': 'Femení',
            'mixed': 'Mixt'
        }
        const genderDisplay = genderMap[team.gender] || team.gender
        parts.push(genderDisplay)
    }

    return parts.join(' ')
}

/**
 * Get the short display name for a team (without gender).
 * Format: "Category Identifier"
 * 
 * @param team - The team object
 * @returns The formatted short display name
 */
export function getTeamShortDisplayName(team: {
    category_stage?: string
    team_suffix?: string | null
}): string {
    const parts: string[] = []

    if (team.category_stage) {
        parts.push(team.category_stage)
    }

    if (team.team_suffix) {
        parts.push(team.team_suffix)
    }

    return parts.join(' ')
}
