/**
 * Rotates the lineup clockwise (standard volleyball rotation).
 * Input: Array of 6 player IDs representing positions [P1, P2, P3, P4, P5, P6].
 * Output: New array [P2, P3, P4, P5, P6, P1] where:
 * - New P1 is old P2 (Front-Right moves to Back-Right/Serve)
 * - New P2 is old P3
 * - New P3 is old P4
 * - New P4 is old P5
 * - New P5 is old P6
 * - New P6 is old P1 (Server moves to Back-Center)
 */
export function rotateLineup(currentLineupIds: string[]): string[] {
    // Safety check
    if (!currentLineupIds || currentLineupIds.length !== 6) {
        // In some edge cases (initial load issues), lineup might be partial.
        // Return as is or handle gracefully.
        console.warn('Invalid lineup length for rotation:', currentLineupIds?.length);
        return currentLineupIds || [];
    }

    return [
        currentLineupIds[1],
        currentLineupIds[2],
        currentLineupIds[3],
        currentLineupIds[4],
        currentLineupIds[5],
        currentLineupIds[0]
    ];
}
