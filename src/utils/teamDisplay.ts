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
    name?: string
    gender?: string
}): string {
    const parts: string[] = []

    // Add category (e.g., "Cadet", "Sènior")
    if (team.category_stage) {
        parts.push(team.category_stage)
    }

    // Add identifier (e.g., "Verd", "A", "B", "Taronja")
    // This is stored in team.name field
    if (team.name) {
        parts.push(team.name)
    }

    // Add gender (e.g., "Masculí", "Femení")
    if (team.gender) {
        const genderMap: Record<string, string> = {
            'male': 'Masculino',
            'female': 'Femenino',
            'mixed': 'Mixto'
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
    name?: string
}): string {
    const parts: string[] = []

    if (team.category_stage) {
        parts.push(team.category_stage)
    }

    if (team.name) {
        parts.push(team.name)
    }

    return parts.join(' ')
}
