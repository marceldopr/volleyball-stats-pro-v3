/**
 * Category utilities for age-based player assignment
 * 
 * Implements:
 * - Hard block: Cannot assign player to LOWER category than age-appropriate
 * - Soft warning: Can assign to HIGHER category with override
 * - Category hierarchy based on Spanish volleyball federation standards
 */

// Assignment status types
export type AssignmentStatus =
    | 'pending_confirmation'  // Valid continuity from previous season
    | 'pending'               // No previous team or new player
    | 'assigned'              // Confirmed assignment
    | 'exception'             // Assigned to higher category with override
    | 'needs_review'          // Previous team no longer valid by age

// Assignment source types
export type AssignmentSource =
    | 'continuity'           // Pre-assignment from previous season
    | 'age_suggestion'       // Suggested by age calculation
    | 'manual'               // Manual assignment by DT

// Category stages in order from youngest to oldest
export const CATEGORY_STAGES = [
    'Benjamín',   // 8-10 años
    'Alevín',     // 10-12 años
    'Infantil',   // 12-14 años
    'Cadete',     // 14-16 años
    'Juvenil',    // 16-18 años
    'Júnior',     // 18-21 años
    'Sénior'      // 21+ años
] as const

export type CategoryStage = typeof CATEGORY_STAGES[number]

// Age ranges for each category (birth year calculation based on season start)
// The age shown is the MAXIMUM age a player can have to be in this category
// Players are assigned based on the year they turn that age
interface CategoryAgeRange {
    stage: CategoryStage
    minAge: number  // Minimum age at season start
    maxAge: number  // Maximum age at season start
}

export const CATEGORY_AGE_RANGES: CategoryAgeRange[] = [
    { stage: 'Benjamín', minAge: 0, maxAge: 9 },
    { stage: 'Alevín', minAge: 10, maxAge: 11 },
    { stage: 'Infantil', minAge: 12, maxAge: 13 },
    { stage: 'Cadete', minAge: 14, maxAge: 15 },
    { stage: 'Juvenil', minAge: 16, maxAge: 17 },
    { stage: 'Júnior', minAge: 18, maxAge: 20 },
    { stage: 'Sénior', minAge: 21, maxAge: 99 }
]

/**
 * Get the hierarchical index of a category (lower = younger)
 */
export function getCategoryIndex(stage: CategoryStage | string): number {
    const idx = CATEGORY_STAGES.indexOf(stage as CategoryStage)
    return idx >= 0 ? idx : -1
}

/**
 * Calculate player's age at a specific date
 */
export function calculateAgeAtDate(birthDate: string, referenceDate: Date): number {
    const birth = new Date(birthDate)
    let age = referenceDate.getFullYear() - birth.getFullYear()
    const monthDiff = referenceDate.getMonth() - birth.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birth.getDate())) {
        age--
    }

    return age
}

/**
 * Get the recommended category for a player based on birth date and season start
 */
export function getRecommendedCategory(birthDate: string, seasonStartDate: string): CategoryStage {
    // Parse season start date (format: YYYY-Www or YYYY-MM-DD)
    let referenceDate: Date
    if (seasonStartDate.includes('-W')) {
        // Week format: YYYY-Www
        const [year, weekStr] = seasonStartDate.split('-W')
        const weekNum = parseInt(weekStr, 10)
        // Get first day of that week
        const jan1 = new Date(parseInt(year, 10), 0, 1)
        const daysToAdd = (weekNum - 1) * 7 + (1 - jan1.getDay())
        referenceDate = new Date(jan1.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
    } else {
        referenceDate = new Date(seasonStartDate)
    }

    const age = calculateAgeAtDate(birthDate, referenceDate)

    // Find the appropriate category
    for (const range of CATEGORY_AGE_RANGES) {
        if (age >= range.minAge && age <= range.maxAge) {
            return range.stage
        }
    }

    // Default to Sénior for very old ages
    return 'Sénior'
}

/**
 * Assignment validation result
 */
export type AssignmentValidation =
    | { valid: true; type: 'ok' }
    | { valid: true; type: 'warning'; message: string }
    | { valid: false; type: 'blocked'; message: string }

/**
 * Validate if a player can be assigned to a team based on age/category
 * 
 * Rules:
 * - Same category: OK
 * - Higher category (player is younger): Allowed with warning
 * - Lower category (player is older): BLOCKED (hard rule)
 */
export function validateAssignment(
    playerBirthDate: string,
    seasonStartDate: string,
    targetCategoryStage: CategoryStage | string
): AssignmentValidation {
    const recommendedCategory = getRecommendedCategory(playerBirthDate, seasonStartDate)
    const recommendedIndex = getCategoryIndex(recommendedCategory)
    const targetIndex = getCategoryIndex(targetCategoryStage)

    // Invalid category
    if (targetIndex === -1) {
        return {
            valid: false,
            type: 'blocked',
            message: 'Categoría de equipo no válida'
        }
    }

    // Same category - OK
    if (targetIndex === recommendedIndex) {
        return { valid: true, type: 'ok' }
    }

    // Higher category (player is younger than the category norm)
    // This is ALLOWED with a warning
    if (targetIndex > recommendedIndex) {
        return {
            valid: true,
            type: 'warning',
            message: `Esta jugadora es de categoría ${recommendedCategory}. Estás asignándola a ${targetCategoryStage} (categoría superior).`
        }
    }

    // Lower category (player is older than the category norm)
    // This is BLOCKED - hard rule
    return {
        valid: false,
        type: 'blocked',
        message: `No se puede asignar a ${targetCategoryStage}. La jugadora es de categoría ${recommendedCategory} (superior por edad).`
    }
}

/**
 * Get display label for a category
 */
export function getCategoryLabel(stage: CategoryStage | string): string {
    return stage
}

/**
 * Get age range description for a category
 */
export function getCategoryAgeDescription(stage: CategoryStage | string): string {
    const range = CATEGORY_AGE_RANGES.find(r => r.stage === stage)
    if (!range) return ''

    if (range.maxAge >= 99) return `${range.minAge}+ años`
    return `${range.minAge}-${range.maxAge} años`
}

/**
 * Compare two categories
 * Returns: negative if a < b, 0 if equal, positive if a > b
 */
export function compareCategories(a: CategoryStage | string, b: CategoryStage | string): number {
    return getCategoryIndex(a) - getCategoryIndex(b)
}

/**
 * Check if a category is below another (younger)
 */
export function isCategoryBelow(category: CategoryStage | string, reference: CategoryStage | string): boolean {
    return getCategoryIndex(category) < getCategoryIndex(reference)
}

/**
 * Check if a category is above another (older)
 */
export function isCategoryAbove(category: CategoryStage | string, reference: CategoryStage | string): boolean {
    return getCategoryIndex(category) > getCategoryIndex(reference)
}
