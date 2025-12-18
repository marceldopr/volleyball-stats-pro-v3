import { TeamDB } from '@/services/teamService'

/**
 * Mapa d'ordre de categories esportives (Sènior=1, Benjamín=7)
 * Ordre oficial: Sènior → Júnior → Juvenil → Cadete → Infantil → Alevín → Benjamín
 */
const CATEGORY_ORDER: Record<string, number> = {
    'Senior': 1,
    'Sénior': 1,
    'Júnior': 2,
    'Junior': 2,
    'Juvenil': 3,
    'Cadete': 4,
    'Infantil': 5,
    'Alevín': 6,
    'Alevin': 6,
    'Benjamín': 7,
    'Benjamin': 7,
}

/**
 * Obté l'ordre numèric d'una categoria esportiva
 * @param categoryStage - Nom de la categoria (ex: "Sénior", "Juvenil")
 * @returns Ordre numèric (1-7), o 99 si la categoria no és reconeguda
 */
export function getCategoryOrder(categoryStage: string): number {
    return CATEGORY_ORDER[categoryStage] || 99
}

/**
 * Compara dues categories per ordenació (Sènior primer, Benjamín últim)
 * @param a - Primera categoria
 * @param b - Segona categoria
 * @returns Número negatiu si a < b, positiu si a > b, 0 si iguals
 */
export function compareCategoryOrder(a: string, b: string): number {
    return getCategoryOrder(a) - getCategoryOrder(b)
}

/**
 * Ordena un array d'equips per l'ordre esportiu correcte:
 * 1. Categoria esportiva (Sènior → Júnior → Juvenil → Cadete → Infantil → Alevín → Benjamín)
 * 2. Identificador/línia (A → B → C) usant sort_order si està disponible
 * 3. Nom de l'equip (fallback alfabètic)
 * 
 * @param teams - Array d'equips a ordenar
 * @returns Nou array ordenat (no modifica l'original)
 * 
 * @example
 * const teams = await teamService.getTeamsByClubAndSeason(clubId, seasonId)
 * const sortedTeams = sortTeamsBySportsCategory(teams)
 * // Resultat: [Sènior A, Sènior B, Júnior A, Juvenil A, Cadete A, Cadete B, ...]
 */
export function sortTeamsBySportsCategory<T extends TeamDB>(teams: T[]): T[] {
    return [...teams].sort((a, b) => {
        // 1. Primer ordenar per categoria esportiva
        const catOrder = compareCategoryOrder(a.category_stage, b.category_stage)
        if (catOrder !== 0) return catOrder

        // 2. Dins de la mateixa categoria, ordenar per identifier.sort_order (si existeix)
        const aSortOrder = a.identifier?.sort_order
        const bSortOrder = b.identifier?.sort_order

        if (aSortOrder !== undefined && bSortOrder !== undefined) {
            if (aSortOrder !== bSortOrder) {
                return aSortOrder - bSortOrder
            }
        }

        // 3. Si no hi ha sort_order, ordenar per identifier.name (A, B, C)
        if (a.identifier?.name && b.identifier?.name) {
            return a.identifier.name.localeCompare(b.identifier.name)
        }

        // 4. Fallback: ordenar per nom de l'equip
        const nameA = a.custom_name || ''
        const nameB = b.custom_name || ''
        return nameA.localeCompare(nameB)
    })
}
