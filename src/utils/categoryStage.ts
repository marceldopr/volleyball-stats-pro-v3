export type CategoryStage =
    | 'Benjamín'
    | 'Alevín'
    | 'Infantil'
    | 'Cadete'
    | 'Juvenil'
    | 'Júnior'
    | 'Sénior';

export const STAGE_ORDER: CategoryStage[] = [
    'Benjamín',
    'Alevín',
    'Infantil',
    'Cadete',
    'Juvenil',
    'Júnior',
    'Sénior'
];

/**
 * Calculates the category stage based on the player's age at the reference date.
 * 
 * Rules:
 * <= 8  -> Benjamín
 * <= 10 -> Alevín
 * <= 12 -> Infantil
 * <= 14 -> Cadete
 * <= 16 -> Juvenil
 * <= 18 -> Júnior
 * > 18  -> Sénior
 * 
 * @param birthDate - The player's birth date (string or Date)
 * @param referenceDate - The season's reference date (Date)
 * @returns The calculated CategoryStage
 */
export function getCategoryStageFromBirthDate(
    birthDate: string | Date,
    referenceDate: Date = new Date() // Default to current date if not provided
): CategoryStage {
    if (!birthDate) return 'Sénior'; // Default fallback

    const birth = new Date(birthDate);

    // Calculate age
    // Calculate age based on year difference only (Federation style)
    const age = referenceDate.getFullYear() - birth.getFullYear();

    // Removed month/day check as requested by user logic
    // if (m < 0 || (m === 0 && referenceDate.getDate() < birth.getDate())) {
    //     age--;
    // }

    if (age <= 9) return 'Benjamín'; // 8-9
    if (age <= 11) return 'Alevín'; // 10-11
    if (age <= 13) return 'Infantil'; // 12-13
    if (age <= 15) return 'Cadete'; // 14-15
    if (age <= 17) return 'Juvenil'; // 16-17
    if (age <= 19) return 'Júnior'; // 18-19

    return 'Sénior'; // 20+
}

/**
 * Returns the index of a stage in the hierarchy (0 = Benjamín, 6 = Sénior)
 */
export function getStageIndex(stage: CategoryStage | string): number {
    return STAGE_ORDER.indexOf(stage as CategoryStage);
}
