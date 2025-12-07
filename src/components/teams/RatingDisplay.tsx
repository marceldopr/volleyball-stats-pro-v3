import { clsx } from 'clsx'

interface RatingDisplayProps {
    label: string
    value?: number
}

const RATING_CONFIG = {
    1: { label: 'Muy mejorable', color: 'red' },
    2: { label: 'Mejorable', color: 'orange' },
    3: { label: 'Adecuado', color: 'yellow' },
    4: { label: 'Bueno', color: 'lime' },
    5: { label: 'Excelente', color: 'green' }
} as const

const COLOR_CLASSES = {
    red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    lime: 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
} as const

/**
 * Compact rating display component for view mode
 * Shows only the selected rating value with label and color
 */
export function RatingDisplay({ label, value }: RatingDisplayProps) {
    if (!value) {
        return (
            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
                <span className="text-sm text-gray-400 dark:text-gray-500">No evaluado</span>
            </div>
        )
    }

    const config = RATING_CONFIG[value as 1 | 2 | 3 | 4 | 5]
    const colorClass = COLOR_CLASSES[config.color]

    return (
        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
            <div className="flex items-center gap-2">
                <span className={clsx('px-3 py-1 rounded-full text-sm font-medium', colorClass)}>
                    {value} - {config.label}
                </span>
            </div>
        </div>
    )
}
