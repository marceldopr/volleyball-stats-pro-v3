import { ReactNode } from 'react'

interface EntityCardProps {
    title: ReactNode
    subtitle?: ReactNode
    meta?: ReactNode
    actions?: ReactNode
    onClick?: () => void
    className?: string
}

export function EntityCard({
    title,
    subtitle,
    meta,
    actions,
    onClick,
    className = ''
}: EntityCardProps) {
    const baseClasses = 'bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow'
    const clickableClasses = onClick ? 'cursor-pointer' : ''

    return (
        <div
            className={`${baseClasses} ${clickableClasses} ${className}`}
            onClick={onClick}
        >
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                    {/* Title */}
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        {title}
                    </h3>

                    {/* Subtitle */}
                    {subtitle && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                            {subtitle}
                        </p>
                    )}

                    {/* Meta */}
                    {meta && (
                        <div className="mt-3">
                            {meta}
                        </div>
                    )}
                </div>

                {/* Actions */}
                {actions && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    )
}
