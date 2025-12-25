import { ChevronRight } from 'lucide-react'

export interface RankingColumn {
    key: string
    label: string
    align?: 'left' | 'center' | 'right'
    format?: (value: any, row?: any) => React.ReactNode
}

interface RankingTableProps {
    title: string
    columns: RankingColumn[]
    data: any[]
    onPlayerClick?: (playerId: string) => void
}

export function RankingTable({ title, columns, data, onPlayerClick }: RankingTableProps) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-full">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">{title}</h3>
            </div>

            <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                            <th className="px-4 py-3 text-center w-12 font-medium text-gray-500 dark:text-gray-400">#</th>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={`px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-${col.align || 'left'}`}
                                >
                                    {col.label}
                                </th>
                            ))}
                            {onPlayerClick && <th className="w-8"></th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                        {data.map((item, index) => (
                            <tr
                                key={item.playerId || index}
                                className={`
                                    group transition-colors
                                    ${onPlayerClick ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer' : ''}
                                `}
                                onClick={() => onPlayerClick && onPlayerClick(item.playerId)}
                            >
                                <td className="px-4 py-3 text-center font-medium text-gray-400 dark:text-gray-500">
                                    {index + 1}
                                </td>
                                {columns.map((col) => {
                                    // Access nested properties like 'points.total'
                                    const value = col.key.split('.').reduce((obj, key) => obj?.[key], item)

                                    return (
                                        <td
                                            key={col.key}
                                            className={`px-4 py-3 text-${col.align || 'left'} text-gray-900 dark:text-gray-200`}
                                        >
                                            {col.format ? col.format(value, item) : value}
                                        </td>
                                    )
                                })}
                                {onPlayerClick && (
                                    <td className="px-2 text-center">
                                        <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-400" />
                                    </td>
                                )}
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={columns.length + 2} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400 italic">
                                    No hay datos disponibles
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
