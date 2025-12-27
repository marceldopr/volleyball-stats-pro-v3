import { Trophy } from 'lucide-react'
import { TeamStanding } from '@/services/clubRankingsService'
import { clsx } from 'clsx'

interface ClubTeamRankingCardProps {
    standings: TeamStanding[]
    currentTeamId?: string
    onTeamSelect?: (teamId: string) => void
    isLoading?: boolean
}

export function ClubTeamRankingCard({
    standings,
    currentTeamId,
    onTeamSelect,
    isLoading
}: ClubTeamRankingCardProps) {

    // Wrapper styles for Card look-and-feel
    const cardBase = "bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
    const cardHeader = "px-6 py-4 border-b border-gray-100 dark:border-gray-700/50"
    const cardTitle = "text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2"

    if (isLoading) {
        return (
            <div className={cardBase}>
                <div className={cardHeader}>
                    <div className="text-sm font-medium text-gray-400 flex items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        Rànquing del Club
                    </div>
                </div>
                <div className="p-6">
                    <div className="h-40 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg"></div>
                </div>
            </div>
        )
    }

    if (!standings || standings.length === 0) {
        return null
    }

    return (
        <div className={cardBase}>
            <div className={cardHeader}>
                <h3 className={clsx(cardTitle, "text-sm uppercase text-gray-900 dark:text-white font-bold")}>
                    <Trophy className="h-4 w-4 text-amber-500" />
                    Rànquing del Club
                </h3>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="py-3 px-3 font-bold w-10 text-gray-900 dark:text-white">#</th>
                            <th className="py-3 px-2 font-bold text-gray-900 dark:text-white">Equip</th>
                            <th className="py-3 px-2 font-bold text-center text-gray-900 dark:text-white">PJ</th>
                            <th className="py-3 px-2 font-bold text-center text-gray-900 dark:text-white">W-L</th>
                            <th className="py-3 px-2 font-bold text-center hidden sm:table-cell text-gray-900 dark:text-white" title="Diferencia de Sets">Dif. Sets</th>
                            <th className="py-3 px-2 font-bold text-center hidden sm:table-cell text-gray-900 dark:text-white" title="Diferencia de Puntos">Dif. Pts</th>
                            <th className="py-3 px-3 font-extrabold text-right text-gray-900 dark:text-white min-w-[60px]">%</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {standings.map((team, index) => {
                            const isCurrent = team.teamId === currentTeamId

                            return (
                                <tr
                                    key={team.teamId}
                                    onClick={() => onTeamSelect && onTeamSelect(team.teamId)}
                                    className={clsx(
                                        "transition-colors",
                                        onTeamSelect ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50" : "",
                                        isCurrent ? "bg-emerald-50 dark:bg-emerald-900/10 border-l-2 border-emerald-500" : "border-l-2 border-transparent"
                                    )}
                                >
                                    <td className="py-3 px-3 text-gray-500 dark:text-gray-400 font-mono">
                                        {index + 1}
                                    </td>
                                    <td className="py-3 px-2">
                                        <div className="flex items-center gap-2">
                                            <span className={clsx(
                                                "font-medium truncate max-w-[140px] sm:max-w-[200px]",
                                                isCurrent ? "text-emerald-700 dark:text-emerald-400 font-bold" : "text-gray-900 dark:text-gray-200"
                                            )}>
                                                {team.teamName}
                                            </span>
                                            {isCurrent && (
                                                <span className="inline-flex items-center rounded-full border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hidden sm:inline-flex">
                                                    Tu
                                                </span>
                                            )}
                                        </div>
                                        {/* Mobile only category */}
                                        <div className="text-xs text-gray-500 sm:hidden">
                                            {team.category}
                                        </div>
                                    </td>
                                    <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-200 font-medium">
                                        {team.gamesPlayed}
                                    </td>
                                    <td className="py-3 px-2 text-center">
                                        <div className="flex justify-center items-center gap-1 font-medium">
                                            <span className="text-emerald-600 dark:text-emerald-400">{team.wins}</span>
                                            <span className="text-gray-400">-</span>
                                            <span className="text-rose-600 dark:text-rose-400">{team.losses}</span>
                                        </div>
                                    </td>
                                    <td className={clsx(
                                        "py-3 px-2 text-center hidden sm:table-cell font-mono font-bold",
                                        team.setsDiff > 0 ? "text-green-600 dark:text-green-400" : team.setsDiff < 0 ? "text-red-500 dark:text-red-400" : "text-gray-500 dark:text-gray-500"
                                    )}>
                                        {team.setsDiff > 0 ? `+${team.setsDiff}` : team.setsDiff}
                                    </td>
                                    <td className={clsx(
                                        "py-3 px-2 text-center hidden sm:table-cell font-mono font-bold",
                                        team.pointsDiff > 0 ? "text-green-600 dark:text-green-400" : team.pointsDiff < 0 ? "text-red-500 dark:text-red-400" : "text-gray-500 dark:text-gray-500"
                                    )}>
                                        {team.pointsDiff > 0 ? `+${team.pointsDiff}` : team.pointsDiff}
                                    </td>
                                    <td className="py-3 px-3 text-right">
                                        <span className={clsx(
                                            "font-bold",
                                            team.winPercentage >= 50 ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"
                                        )}>
                                            {team.winPercentage}%
                                        </span>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
            {/* Legend for mobile */}
            <div className="p-2 bg-gray-50 dark:bg-gray-900/80 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 text-center sm:hidden">
                W: Victoria · L: Derrota · %: Porcentaje Victoria
            </div>
        </div>
    )
}
