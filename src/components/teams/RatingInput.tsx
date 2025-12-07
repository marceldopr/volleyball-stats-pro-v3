import { clsx } from 'clsx'

interface RatingInputProps {
    label: string
    value?: number
    onChange: (value: number) => void
    disabled?: boolean
}

const RATINGS = [
    { value: 1, label: 'Muy mejorable', color: 'red' },
    { value: 2, label: 'Mejorable', color: 'orange' },
    { value: 3, label: 'Adecuado', color: 'yellow' },
    { value: 4, label: 'Bueno', color: 'lime' },
    { value: 5, label: 'Excelente', color: 'green' }
]

export function RatingInput({ label, value, onChange, disabled = false }: RatingInputProps) {
    return (
        <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                {label}
            </label>
            <div className="flex gap-1.5">
                {RATINGS.map((rating) => {
                    const isSelected = value === rating.value

                    return (
                        <button
                            key={rating.value}
                            type="button"
                            onClick={() => !disabled && onChange(rating.value)}
                            disabled={disabled}
                            className={clsx(
                                'flex-1 px-2 py-3 rounded-lg font-bold text-lg transition-all',
                                'border-2 focus:outline-none focus:ring-2 focus:ring-offset-1',
                                isSelected
                                    ? // Active state
                                    rating.color === 'red'
                                        ? 'bg-red-500 text-white border-red-600 shadow-md focus:ring-red-500 dark:bg-red-600 dark:border-red-700'
                                        : rating.color === 'orange'
                                            ? 'bg-orange-500 text-white border-orange-600 shadow-md focus:ring-orange-500 dark:bg-orange-600 dark:border-orange-700'
                                            : rating.color === 'yellow'
                                                ? 'bg-yellow-500 text-white border-yellow-600 shadow-md focus:ring-yellow-500 dark:bg-yellow-600 dark:border-yellow-700'
                                                : rating.color === 'lime'
                                                    ? 'bg-lime-500 text-white border-lime-600 shadow-md focus:ring-lime-500 dark:bg-lime-600 dark:border-lime-700'
                                                    : 'bg-green-500 text-white border-green-600 shadow-md focus:ring-green-500 dark:bg-green-600 dark:border-green-700'
                                    : // Inactive state
                                    rating.color === 'red'
                                        ? 'bg-white text-red-700 border-red-200 hover:bg-red-50 focus:ring-red-500 dark:bg-gray-800 dark:text-red-400 dark:border-red-800 dark:hover:bg-gray-700'
                                        : rating.color === 'orange'
                                            ? 'bg-white text-orange-700 border-orange-200 hover:bg-orange-50 focus:ring-orange-500 dark:bg-gray-800 dark:text-orange-400 dark:border-orange-800 dark:hover:bg-gray-700'
                                            : rating.color === 'yellow'
                                                ? 'bg-white text-yellow-700 border-yellow-200 hover:bg-yellow-50 focus:ring-yellow-500 dark:bg-gray-800 dark:text-yellow-400 dark:border-yellow-800 dark:hover:bg-gray-700'
                                                : rating.color === 'lime'
                                                    ? 'bg-white text-lime-700 border-lime-200 hover:bg-lime-50 focus:ring-lime-500 dark:bg-gray-800 dark:text-lime-400 dark:border-lime-800 dark:hover:bg-gray-700'
                                                    : 'bg-white text-green-700 border-green-200 hover:bg-green-50 focus:ring-green-500 dark:bg-gray-800 dark:text-green-400 dark:border-green-800 dark:hover:bg-gray-700',
                                disabled && 'opacity-50 cursor-not-allowed',
                                !disabled && 'cursor-pointer'
                            )}
                            title={`${rating.value} - ${rating.label}`}
                        >
                            <span className="text-lg font-bold">{rating.value}</span>
                        </button>
                    )
                })}
            </div>
            {value && (
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    {RATINGS.find(r => r.value === value)?.label}
                </div>
            )}
        </div>
    )
}
