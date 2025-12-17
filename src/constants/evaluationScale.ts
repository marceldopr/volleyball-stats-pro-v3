/**
 * Single Source of Truth for Club Rating Scale
 * 
 * This scale is used across:
 * - Evaluaciones (input): Numeric 1-5 selection
 * - Informes (output): Visual star representation
 */

export const EVALUATION_SCALE = {
    name: 'Escala de valoració del club (1–5)',
    labels: {
        1: 'Muy mejorable',
        2: 'Mejorable',
        3: 'Adecuado',
        4: 'Bueno',
        5: 'Excelente'
    },
    description: '1=Muy mejorable • 2=Mejorable • 3=Adecuado • 4=Bueno • 5=Excelente'
} as const

/**
 * Get the label for a given rating value
 * @param rating - Numeric rating from 1 to 5
 * @returns The corresponding label or empty string if invalid
 */
export function getRatingLabel(rating: number): string {
    return EVALUATION_SCALE.labels[rating as keyof typeof EVALUATION_SCALE.labels] || ''
}
