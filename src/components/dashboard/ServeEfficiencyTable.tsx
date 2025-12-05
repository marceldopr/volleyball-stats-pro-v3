import { ServeEfficiencyStats } from '@/services/teamStatsService'

interface ServeEfficiencyTableProps {
    data: ServeEfficiencyStats[]
}

export function ServeEfficiencyTable({ data }: ServeEfficiencyTableProps) {
    // Sort by efficiency
    const sortedData = [...data].sort((a, b) => b.efficiency - a.efficiency)

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">Eficacia de saque</h3>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                            <th className="px-4 py-3 text-center w-12 font-medium text-gray-500 dark:text-gray-400">#</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Jugadora</th>
                            <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Aces</th>
                            <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Err</th>
                            <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Saq</th>
                            <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Eficacia</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                        {sortedData.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400 italic">
                                    No hay datos disponibles
                                </td>
                            </tr>
                        ) : (
                            sortedData.map((player, index) => (
                                <tr key={player.playerId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-3 text-center font-medium text-gray-400 dark:text-gray-500">
                                        {index + 1}
                                    </td>
                                    <td className="px-4 py-3 text-left text-gray-900 dark:text-gray-200">
                                        {player.playerName}
                                    </td>
                                    <td className="px-4 py-3 text-center text-gray-900 dark:text-gray-200">
                                        {player.aces}
                                    </td>
                                    <td className="px-4 py-3 text-center text-red-600 dark:text-red-400">
                                        {player.serveErrors}
                                    </td>
                                    <td className="px-4 py-3 text-center text-gray-900 dark:text-gray-200">
                                        {player.servesExecuted || '—'}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`font-bold ${player.efficiency > 0
                                                ? 'text-green-600 dark:text-green-400'
                                                : player.efficiency < 0
                                                    ? 'text-red-600 dark:text-red-400'
                                                    : 'text-gray-600 dark:text-gray-400'
                                            }`}>
                                            {player.efficiency > 0 ? '+' : ''}{player.efficiency.toFixed(1)}%
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
