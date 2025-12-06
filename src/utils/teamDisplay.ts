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
    name?: string | null
    gender?: string
}): string {
    const genderMap: Record<string, string> = {
        'male': 'Masculino',
        'female': 'Femenino',
        'mixed': 'Mixto'
    }
    const genderDisplay = team.gender ? (genderMap[team.gender] || team.gender) : undefined

    return [
        team.category_stage,
        team.name, // The 'label' or identifier (e.g. "A", "Verde")
        genderDisplay
    ]
        .filter(Boolean)
        .join(' ')
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
    name?: string | null
}): string {
    return [
        team.category_stage,
        team.name
    ]
        .filter(Boolean)
        .join(' ')
}
