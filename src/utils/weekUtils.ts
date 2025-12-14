/**
 * ISO Week utilities for season management
 * Week starts on Monday (ISO 8601 standard)
 */

/**
 * Get ISO week number (1-53) for a given date
 * ISO weeks start on Monday
 */
export function getISOWeek(date: Date): number {
    const d = new Date(date.getTime())
    d.setHours(0, 0, 0, 0)
    // Thursday in current week decides the year
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7)
    // January 4 is always in week 1
    const week1 = new Date(d.getFullYear(), 0, 4)
    // Adjust to Thursday in week 1 and count number of weeks from date to week1
    return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
}

/**
 * Get ISO week year for a given date
 * The ISO year can differ from calendar year for dates near year boundaries
 */
export function getISOWeekYear(date: Date): number {
    const d = new Date(date.getTime())
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7)
    return d.getFullYear()
}

/**
 * Format date as ISO week string (YYYY-W##)
 * Example: "2024-W35"
 */
export function getWeekId(date: Date): string {
    const year = getISOWeekYear(date)
    const week = getISOWeek(date)
    return `${year}-W${week.toString().padStart(2, '0')}`
}

/**
 * Parse ISO week string to year and week number
 * Example: "2024-W35" -> { year: 2024, week: 35 }
 */
export function parseWeekId(weekId: string): { year: number; week: number } | null {
    const match = weekId.match(/^(\d{4})-W(\d{2})$/)
    if (!match) return null
    return {
        year: parseInt(match[1], 10),
        week: parseInt(match[2], 10)
    }
}

/**
 * Check if a week ID falls within a range (inclusive)
 * All parameters in format "YYYY-W##"
 */
export function isWeekInRange(weekId: string, startWeekId: string | null, endWeekId: string | null): boolean {
    if (!startWeekId || !endWeekId) return false

    const week = parseWeekId(weekId)
    const start = parseWeekId(startWeekId)
    const end = parseWeekId(endWeekId)

    if (!week || !start || !end) return false

    // Compare as numbers: YYYYWW
    const weekNum = week.year * 100 + week.week
    const startNum = start.year * 100 + start.week
    const endNum = end.year * 100 + end.week

    return weekNum >= startNum && weekNum <= endNum
}

/**
 * Validate that end week is not before start week
 */
export function isValidWeekRange(startWeekId: string, endWeekId: string): boolean {
    const start = parseWeekId(startWeekId)
    const end = parseWeekId(endWeekId)

    if (!start || !end) return false

    const startNum = start.year * 100 + start.week
    const endNum = end.year * 100 + end.week

    return endNum >= startNum
}
