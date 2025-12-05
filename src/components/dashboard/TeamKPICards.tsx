import { TeamKPIs } from '@/services/teamStatsService'
import { AlertCircle } from 'lucide-react'

interface TeamKPICardsProps {
    kpis: TeamKPIs | null
    loading?: boolean
}

export function TeamKPICards({ kpis, loading }: TeamKPICardsProps) {
    if (loading) {
        return null // Or show skeleton
    }

    if (!kpis || kpis.totalSets === 0) {
        return (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <p className="text-amber-800 dark:text-amber-200 font-medium">
                        Aún no hay datos de partidos para estos indicadores
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Errores por set */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Errores no forzados / set
                </h3>
                <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">
                        {kpis.errorsPerSet.toFixed(1)}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        / {kpis.totalSets} sets
                    </span>
                </div>
            </div>

            {/* Origen de puntos */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Origen de los puntos del rival
                </h3>
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Puntos propios</span>
                        <span className="text-lg font-bold text-green-600 dark:text-green-400">
                            {kpis.ownPointsPercentage.toFixed(0)}%
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                            className="bg-green-500 h-2 rounded-full transition-all"
                            style={{ width: `${kpis.ownPointsPercentage}%` }}
                        />
                    </div>
                    <div className="flex items-center justify-between mt-3">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Puntos regalados</span>
                        <span className="text-lg font-bold text-red-600 dark:text-red-400">
                            {kpis.givenPointsPercentage.toFixed(0)}%
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                            className="bg-red-500 h-2 rounded-full transition-all"
                            style={{ width: `${kpis.givenPointsPercentage}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
