/**
 * Format win/loss ratio for display with context
 * @param wins Number of wins
 * @param losses Number of losses
 * @returns Formatted string with context
 */
export function formatWinLossDisplay(wins: number, losses: number): string {
    if (wins === 0 && losses === 0) {
        return '--'
    }

    if (losses === 0) {
        return `Invicto (${wins}-0)`
    }

    if (wins === 0) {
        return `${wins}-${losses}`
    }

    const ratio = (wins / losses).toFixed(2)
    return `Ratio ${ratio} (${wins}-${losses})`
}
