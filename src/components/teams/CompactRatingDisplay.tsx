import { clsx } from 'clsx'

interface CompactRatingDisplayProps {
    label: string
    startValue?: number
    midValue?: number
    endValue?: number
}

const RATING_LABELS = {
    1: 'Muy mejorable',
    2: 'Mejorable',
    3: 'Adecuado',
    4: 'Bueno',
    5: 'Excelente'
} as const

const RATING_COLORS = {
    1: 'bg-red-500 text-white',
    2: 'bg-orange-500 text-white',
    3: 'bg-yellow-500 text-white',
    4: 'bg-lime-500 text-white',
    5: 'bg-green-500 text-white'
} as const

/**
 * Compact rating display showing 3 phases side by side
 * Used in comparative evaluation view
 */
export function CompactRatingDisplay({
    label,
    startValue,
    midValue,
    endValue
}: CompactRatingDisplayProps) {
    const renderRating = (value: number | undefined, phase: string) => {
        if (!value) {
            return (
                <div className="flex-1 px-1.5 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 text-center text-sm min-w-0">
                    <div className="font-medium text-xs mb-0.5 truncate">{phase}</div>
                    <div className="text-sm">-</div>
                </div>
            )
        }

        const colorClass = RATING_COLORS[value as 1 | 2 | 3 | 4 | 5]
        const labelText = RATING_LABELS[value as 1 | 2 | 3 | 4 | 5]

        return (
            <div
                className={clsx(
                    'flex-1 px-1.5 py-2 rounded-lg text-center shadow-sm min-w-0',
                    colorClass
                )}
                title={`${phase}: ${value} - ${labelText}`}
            >
                <div className="font-medium text-xs mb-0.5 opacity-90 truncate">{phase}</div>
                <div className="text-base font-bold">{value}</div>
            </div>
        )
    }

    return (
        <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                {label}
            </label>
            <div className="flex gap-1.5">
                {renderRating(startValue, 'Inicio')}
                {renderRating(midValue, 'Mitad')}
                {renderRating(endValue, 'Final')}
            </div>
        </div>
    )
}
