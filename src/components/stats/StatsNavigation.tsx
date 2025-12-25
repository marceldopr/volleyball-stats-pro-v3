import { useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, Trophy } from 'lucide-react'

export function StatsNavigation() {
    const location = useLocation()
    const navigate = useNavigate()

    // Check active path
    const isRankings = location.pathname.includes('/rankings')

    return (
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit mb-6">
            <button
                onClick={() => navigate('/stats')}
                className={`
                    flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                    ${!isRankings
                        ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'}
                `}
            >
                <BarChart3 className="w-4 h-4" />
                Equipos
            </button>
            <button
                onClick={() => navigate('/stats/rankings')}
                className={`
                    flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                    ${isRankings
                        ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'}
                `}
            >
                <Trophy className="w-4 h-4" />
                Rànquings
            </button>
        </div>
    )
}
