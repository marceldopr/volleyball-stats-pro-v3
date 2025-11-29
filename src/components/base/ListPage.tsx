import { ReactNode, useState } from 'react'
import { Search } from 'lucide-react'

interface ListPageProps {
    title: string
    subtitle?: string
    action?: {
        label: string
        onClick: () => void
        icon?: ReactNode
    }
    searchPlaceholder?: string
    onSearch?: (query: string) => void
    children: ReactNode
    emptyState?: ReactNode
    filters?: ReactNode
}

export function ListPage({
    title,
    subtitle,
    action,
    searchPlaceholder,
    onSearch,
    children,
    emptyState,
    filters
}: ListPageProps) {
    const [searchQuery, setSearchQuery] = useState('')

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value
        setSearchQuery(query)
        onSearch?.(query)
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
                            {subtitle && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
                            )}
                        </div>

                        {action && (
                            <button
                                onClick={action.onClick}
                                className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
                            >
                                {action.icon}
                                <span>{action.label}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Search and Filters */}
                {(onSearch || filters) && (
                    <div className="mb-6 flex flex-col sm:flex-row gap-4">
                        {onSearch && (
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder={searchPlaceholder || 'Buscar...'}
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>
                        )}
                        {filters && (
                            <div className="flex gap-2">
                                {filters}
                            </div>
                        )}
                    </div>
                )}

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {children}
                </div>

                {/* Empty State */}
                {emptyState}
            </div>
        </div>
    )
}
