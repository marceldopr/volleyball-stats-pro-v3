import { clsx } from 'clsx'

interface RatingInputProps {
    label: string
    value?: number
    onChange: (value: number) => void
    disabled?: boolean
}

const RATINGS = [
    { value: 1, label: 'Mejorar', color: 'red', description: 'Needs improvement' },
    { value: 2, label: 'Adecuado', color: 'yellow', description: 'Adequate' },
    { value: 3, label: 'Excelente', color: 'green', description: 'Excellent' }
]

export function RatingInput({ label, value, onChange, disabled = false }: RatingInputProps) {
    return (
        <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                {label}
            </label>
            <div className="flex gap-2">
                {RATINGS.map((rating) => (
                    <button
                        key={rating.value}
                        type="button"
                        onClick={() => !disabled && onChange(rating.value)}
                        disabled={disabled}
                        className={clsx(
                            'flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-all',
                            'border-2 focus:outline-none focus:ring-2 focus:ring-offset-2',
                            value === rating.value
                                ? // Active state
                                rating.color === 'red'
                                    ? 'bg-red-500 text-white border-red-600 shadow-md focus:ring-red-500 dark:bg-red-600 dark:border-red-700'
                                    : rating.color === 'yellow'
                                        ? 'bg-yellow-500 text-white border-yellow-600 shadow-md focus:ring-yellow-500 dark:bg-yellow-600 dark:border-yellow-700'
                                        : 'bg-green-500 text-white border-green-600 shadow-md focus:ring-green-500 dark:bg-green-600 dark:border-green-700'
                                : // Inactive state
                                rating.color === 'red'
                                    ? 'bg-white text-red-700 border-red-300 hover:bg-red-50 focus:ring-red-500 dark:bg-gray-800 dark:text-red-400 dark:border-red-700 dark:hover:bg-gray-700'
                                    : rating.color === 'yellow'
                                        ? 'bg-white text-yellow-700 border-yellow-300 hover:bg-yellow-50 focus:ring-yellow-500 dark:bg-gray-800 dark:text-yellow-400 dark:border-yellow-700 dark:hover:bg-gray-700'
                                        : 'bg-white text-green-700 border-green-300 hover:bg-green-50 focus:ring-green-500 dark:bg-gray-800 dark:text-green-400 dark:border-green-700 dark:hover:bg-gray-700',
                            disabled && 'opacity-50 cursor-not-allowed hover:bg-white dark:hover:bg-gray-800',
                            !disabled && 'cursor-pointer'
                        )}
                        title={`${rating.value} - ${rating.label}`}
                    >
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-lg font-bold">{rating.value}</span>
                            <span className="text-xs">{rating.label}</span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    )
}
