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
 * Uses "Sport Age" logic (Year of Reference - Year of Birth)
 * This ensures all players born in the same year are in the same cohort
 */
export function calculateAgeAtDate(birthDate: string, referenceDate: Date): number {
    const birth = new Date(birthDate)
    // Standard sport age: reference year - birth year
    // Everyone born in 2008 is the same "sport age" regardless of day/month
    return referenceDate.getFullYear() - birth.getFullYear()
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

// ============================================================================
// DB-BASED CATEGORY FUNCTIONS
// These use categories from club_categories table (source of truth)
// ============================================================================

import type { CategoryDB } from '@/services/categoryService'

/**
 * Result of category calculation from DB
 */
export interface CategoryResult {
    found: boolean
    category: CategoryDB | null
    name: string
    ageRange: string
    computedAge?: number
    reason?: 'too_young' | 'too_old' | 'gap'
}

/**
 * Calculate the expected category for a player based on DB categories
 * Uses only birth year and season start year (no dates)
 * This is the source of truth - no hardcoded age ranges
 */
export function getExpectedCategoryFromDB(
    birthYear: number,
    seasonStartYear: number,
    gender: 'female' | 'male',
    categories: CategoryDB[]
): CategoryResult {
    // Calculate age key (standard volleyball federation rule)
    const age = seasonStartYear - birthYear

    // Filter categories by gender and sort by sort_order
    const genderCategories = categories
        .filter(c => c.gender === gender && c.is_active)
        .sort((a, b) => a.sort_order - b.sort_order)

    // Find matching category by age
    for (const cat of genderCategories) {
        const minAge = cat.min_age ?? 0
        const maxAge = cat.max_age ?? 99

        if (age >= minAge && age <= maxAge) {
            return {
                found: true,
                category: cat,
                name: cat.name,
                ageRange: maxAge >= 99 ? `${minAge}+ años` : `${minAge}-${maxAge} años`,
                computedAge: age
            }
        }
    }

    // If no match found, calculate reason
    if (genderCategories.length > 0) {
        const youngest = genderCategories[0]
        const oldest = genderCategories[genderCategories.length - 1]
        const minAge = youngest.min_age ?? 0
        const maxAge = oldest.max_age ?? 99

        let reason: 'too_young' | 'too_old' | 'gap' = 'gap'
        if (age < minAge) reason = 'too_young'
        else if (age > maxAge) reason = 'too_old'

        return {
            found: false,
            category: null,
            name: 'Sin categoría definida',
            ageRange: '',
            computedAge: age,
            reason
        }
    }

    return {
        found: false,
        category: null,
        name: 'Sin categoría definida',
        ageRange: '',
        computedAge: age,
        reason: 'gap'
    }
}

/**
 * Get category index from DB categories (for comparison)
 */
export function getCategoryIndexFromDB(categoryName: string, categories: CategoryDB[]): number {
    const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order)
    return sorted.findIndex(c => c.name === categoryName)
}

/**
 * Validate assignment using DB categories
 */
export function validateAssignmentFromDB(
    birthYear: number,
    playerGender: 'female' | 'male',
    seasonStartYear: number,
    targetCategoryName: string,
    categories: CategoryDB[]
): AssignmentValidation {
    const expected = getExpectedCategoryFromDB(birthYear, seasonStartYear, playerGender, categories)

    if (!expected.found || !expected.category) {
        return {
            valid: false,
            type: 'blocked',
            message: 'No hay categoría definida para esta jugadora'
        }
    }

    const genderCategories = categories
        .filter(c => c.gender === playerGender && c.is_active)
        .sort((a, b) => a.sort_order - b.sort_order)

    const expectedIndex = genderCategories.findIndex(c => c.name === expected.name)
    const targetIndex = genderCategories.findIndex(c => c.name === targetCategoryName)

    if (targetIndex === -1) {
        return {
            valid: false,
            type: 'blocked',
            message: 'Categoría de equipo no válida'
        }
    }

    // Same category - OK
    if (targetIndex === expectedIndex) {
        return { valid: true, type: 'ok' }
    }

    // Higher category (player is younger) - WARNING
    if (targetIndex > expectedIndex) {
        return {
            valid: true,
            type: 'warning',
            message: `Esta jugadora es de categoría ${expected.name}. Estás asignándola a ${targetCategoryName} (categoría superior).`
        }
    }

    // Lower category (player is older) - BLOCKED
    return {
        valid: false,
        type: 'blocked',
        message: `No se puede asignar a ${targetCategoryName}. La jugadora es de categoría ${expected.name} (superior por edad).`
    }
}

