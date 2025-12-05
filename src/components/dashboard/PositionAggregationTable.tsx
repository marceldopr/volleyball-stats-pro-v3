import { PositionStats } from '@/services/teamStatsService'

interface PositionAggregationTableProps {
    data: PositionStats[]
}

export function PositionAggregationTable({ data }: PositionAggregationTableProps) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">Rendimiento por posición</h3>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Posición</th>
                            <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Puntos</th>
                            <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Errores</th>
                            <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Ratio P/E</th>
                            <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Volumen</th>
                            <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">% Pts equipo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400 italic">
                                    No hay datos disponibles
                                </td>
                            </tr>
                        ) : (
                            data.map((positionStat) => (
                                <tr key={positionStat.position} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">
                                        {positionStat.position}
                                    </td>
                                    <td className="px-4 py-3 text-center text-gray-900 dark:text-gray-200">
                                        {positionStat.points}
                                    </td>
                                    <td className="px-4 py-3 text-center text-red-600 dark:text-red-400">
                                        {positionStat.errors}
                                    </td>
                                    <td className="px-4 py-3 text-center font-medium text-gray-900 dark:text-gray-200">
                                        {positionStat.ratio.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-center text-gray-900 dark:text-gray-200">
                                        {positionStat.volume}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="font-bold text-primary-600 dark:text-primary-400">
                                            {positionStat.percentageOfTeamPoints.toFixed(1)}%
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
