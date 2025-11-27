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
    let age = referenceDate.getFullYear() - birth.getFullYear();
    const m = referenceDate.getMonth() - birth.getMonth();

    // Adjust age if birthday hasn't occurred yet relative to reference date
    if (m < 0 || (m === 0 && referenceDate.getDate() < birth.getDate())) {
        age--;
    }

    if (age <= 8) return 'Benjamín';
    if (age <= 10) return 'Alevín';
    if (age <= 12) return 'Infantil';
    if (age <= 14) return 'Cadete';
    if (age <= 16) return 'Juvenil';
    if (age <= 18) return 'Júnior';

    return 'Sénior';
}

/**
 * Returns the index of a stage in the hierarchy (0 = Benjamín, 6 = Sénior)
 */
export function getStageIndex(stage: CategoryStage | string): number {
    return STAGE_ORDER.indexOf(stage as CategoryStage);
}
