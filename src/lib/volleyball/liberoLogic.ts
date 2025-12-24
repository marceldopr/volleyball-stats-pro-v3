/**
 * Shared Libero Logic for Volleyball Stats Pro
 * Extracted from V1 to ensuring consistency across V1 and V2.
 */

/**
 * Calculates the current rotation display, automatically substituting MBs with Liberos
 * in back-row positions according to standard volleyball rules.
 * 
 * @param baseRotation Array of player IDs representing the current rotation (P1 to P6)
 * @param liberoId The ID of the libero player (or null if none)
 * @param isServing Whether the current team is serving
 * @param getPlayerRole Function that returns the role/position code (e.g., 'MB', 'OH') for a given player ID
 * @returns A new rotation array with Libero substitutions applied
 */
export function calculateLiberoRotation(
    baseRotation: (string | null)[],
    liberoId: string | null,
    isServing: boolean,
    getPlayerRole: (id: string) => string | undefined
): (string | null)[] {
    // If no libero, return base rotation unchanged
    if (!liberoId) {
        return [...baseRotation];
    }

    const displayRotation = [...baseRotation];

    // Back row positions are P1, P6, P5 (array indices 0, 5, 4)
    const backRowIndices = [4, 5, 0]; // Indices for P5, P6, P1

    backRowIndices.forEach(arrayIndex => {
        const playerId = baseRotation[arrayIndex];
        if (!playerId) return;

        const role = getPlayerRole(playerId);

        // Only substitute if player is MB (Middle Blocker)
        // Standard codes: 'MB', 'C' (Central in Spanish), etc.
        // We assume normalized codes or handle common variations if needed.
        if (role === 'MB' || role === 'C') {
            const positionNumber = arrayIndex === 4 ? 5 : (arrayIndex === 5 ? 6 : 1);

            // Rule a) MB in position 1 (array index 0) and team is serving: no substitution
            // (Libero cannot serve in most rules, though some allow it, we stick to V1 logic: MB serves)
            if (positionNumber === 1 && isServing) {
                // Keep MB, no substitution
            } else {
                // Rule b) MB in back row (5, 6) or position 1 not serving: substitute with libero
                displayRotation[arrayIndex] = liberoId;
            }
        }
    });

    return displayRotation;
}

/**
 * Determines if a player is currently replaceable by a Libero
 * (Typically an MB in the back row)
 */
export function isLiberoReplaceable(
    positionIndex: number, // 0-5 (P1-P6)
    isServing: boolean,
    role: string
): boolean {
    if (role !== 'MB' && role !== 'C') return false;

    // Back row indices: 0 (P1), 4 (P5), 5 (P6)
    const isBackRow = [0, 4, 5].includes(positionIndex);

    if (!isBackRow) return false;

    // If P1 (index 0) and serving, NOT replaceable
    if (positionIndex === 0 && isServing) return false;

    return true;
}
