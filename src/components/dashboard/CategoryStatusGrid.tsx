import { CategorySummary } from '@/services/clubStatsService'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface CategoryStatusGridProps {
    categories: CategorySummary[]
}

export function CategoryStatusGrid({ categories }: CategoryStatusGridProps) {
    const navigate = useNavigate()

    // Helper functions for color coding
    const getStatusColor = (status: 'high' | 'medium' | 'low') => {
        switch (status) {
            case 'high': return 'bg-red-500'
            case 'medium': return 'bg-amber-500'
            case 'low': return 'bg-emerald-500'
        }
    }

    const getRosterColor = (size: number) => {
        if (size < 9) return 'text-red-500 font-semibold'
        if (size === 9) return 'text-amber-500 font-semibold'
        return 'text-emerald-600 dark:text-emerald-400'
    }

    const getAttColor = (att: number) => {
        if (att < 80) return 'text-red-500 font-semibold'
        if (att < 85) return 'text-amber-500 font-semibold'
        return 'text-emerald-600 dark:text-emerald-400'
    }

    if (categories.length === 0) {
        return (
            <p className="text-sm text-gray-500 text-center py-8">
                No hay categorías configuradas.
            </p>
        )
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((cat) => (
                <div
                    key={cat.id}
                    onClick={() => navigate('/club/dashboard')}
                    className={cn(
                        "bg-white dark:bg-gray-800 p-4 rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden",
                        cat.riskLevel === 'high' ? "border-l-4 border-l-red-500 border-gray-200 dark:border-gray-700" :
                            cat.riskLevel === 'medium' ? "border-l-4 border-l-amber-500 border-gray-200 dark:border-gray-700" :
                                cat.riskLevel === 'low' ? "border-l-4 border-l-emerald-500 border-gray-200 dark:border-gray-700" :
                                    "border-l-4 border-l-gray-300 border-gray-200 dark:border-gray-700"
                    )}
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-gray-900 dark:text-white truncate">{cat.name}</span>
                        {cat.riskLevel === 'high' && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 uppercase tracking-wider">Atención</span>}
                        {cat.riskLevel === 'medium' && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 uppercase tracking-wider">Revisar</span>}
                        {cat.riskLevel === 'low' && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 uppercase tracking-wider">Óptimo</span>}
                        {!cat.riskLevel && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 uppercase tracking-wider">--</span>}
                    </div>

                    {/* Team Details List */}
                    <div className="space-y-1.5">
                        {cat.teams && cat.teams.slice(0, 4).map((team) => (
                            <div key={team.id} className="flex items-center justify-between text-xs py-1">
                                {/* Left: Status + Name */}
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", getStatusColor(team.globalStatus))} />
                                    <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{team.shortName}</span>
                                </div>

                                {/* Right: Metrics */}
                                <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 flex-shrink-0">
                                    {/* Roster */}
                                    <span className={cn("text-[11px]", getRosterColor(team.rosterSize))}>
                                        {team.rosterSize} jug.
                                    </span>

                                    {/* Attendance */}
                                    {team.attendance !== null && (
                                        <span className={cn("text-[11px]", getAttColor(team.attendance))}>
                                            {team.attendance >= 85 ? 'OK' : `${team.attendance}%`}
                                        </span>
                                    )}

                                    {/* Health issues */}
                                    {team.injuryCount > 0 && (
                                        <span className="text-red-500 text-[10px] whitespace-nowrap">
                                            🟠 {team.injuryCount} no disp.
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Overflow indicator */}
                        {cat.teams && cat.teams.length > 4 && (
                            <div className="text-[10px] text-center text-gray-400 dark:text-gray-500 italic pt-1 border-t border-gray-100 dark:border-gray-700">
                                +{cat.teams.length - 4} equipos más...
                            </div>
                        )}

                        {/* No teams */}
                        {(!cat.teams || cat.teams.length === 0) && (
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 italic text-center py-2">
                                Sin equipos configurados
                            </p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}
