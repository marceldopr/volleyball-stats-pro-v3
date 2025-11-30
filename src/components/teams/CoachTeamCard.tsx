import { useEffect, useState } from 'react'
import { TeamDB } from '@/services/teamService'
import { teamStatsService, CurrentPhaseInfo, RecentActivity } from '@/services/teamStatsService'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

interface CoachTeamCardProps {
    team: TeamDB
    seasonId: string
    onClick: () => void
}

export function CoachTeamCard({ team, seasonId, onClick }: CoachTeamCardProps) {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [phase, setPhase] = useState<CurrentPhaseInfo | null>(null)
    const [activity, setActivity] = useState<RecentActivity | null>(null)
    const [stats, setStats] = useState<{ attendance: number } | null>(null)

    useEffect(() => {
        async function loadCardData() {
            if (!team.id || !seasonId) return

            try {
                setLoading(true)
                const [phaseData, activityData, statsData] = await Promise.all([
                    teamStatsService.getCurrentPhase(team.id, seasonId),
                    teamStatsService.getRecentActivity(team.id, seasonId),
                    teamStatsService.getTeamStats(team.id, seasonId)
                ])

                setPhase(phaseData)
                setActivity(activityData)
                setStats({ attendance: statsData.attendanceAverage })
            } catch (error) {
                console.error('Error loading team card data:', error)
            } finally {
                setLoading(false)
            }
        }

        loadCardData()
    }, [team.id, seasonId])

    const getGenderLabel = (gender: string) => {
        if (gender === 'male') return 'Masculino'
        if (gender === 'female') return 'Femenino'
        return 'Mixto'
    }

    const handleAction = (e: React.MouseEvent, path: string) => {
        e.stopPropagation()
        navigate(path)
    }

    return (
        <div
            onClick={onClick}
            className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer flex flex-col h-full min-h-[320px]"
        >
            {/* Header */}
            <div className="p-5 border-b border-gray-100 dark:border-gray-700/50">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-1">
                        {team.name}
                    </h3>
                    <span className={clsx(
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        team.gender === 'female' ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300" :
                            team.gender === 'male' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" :
                                "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    )}>
                        {getGenderLabel(team.gender)}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>{team.category_stage || 'Sin categoría'}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                    <span>{team.competition_level || 'Sin división'}</span>
                </div>
            </div>

            {/* Body */}
            <div className="p-5 flex-1 flex flex-col gap-4">
                {loading ? (
                    <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                ) : (
                    <>
                        {/* Phase Info */}
                        <div>
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                                Planificación
                            </p>
                            <div className="flex items-center gap-2">
                                <span className={clsx(
                                    "w-2 h-2 rounded-full",
                                    phase?.phaseNumber === 1 ? "bg-emerald-500" :
                                        phase?.phaseNumber === 2 ? "bg-orange-500" :
                                            phase?.phaseNumber === 3 ? "bg-blue-500" : "bg-gray-400"
                                )} />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    {phase ? `${phase.phaseName} — ${phase.primaryGoal}` : 'Sin planificación activa'}
                                </span>
                            </div>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div>
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                                    Último Partido
                                </p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {activity?.lastMatch ? (
                                        <>
                                            <span className={clsx(
                                                activity.lastMatch.result === 'win' ? "text-emerald-600 dark:text-emerald-400" :
                                                    activity.lastMatch.result === 'loss' ? "text-red-600 dark:text-red-400" :
                                                        "text-gray-600 dark:text-gray-400"
                                            )}>
                                                {activity.lastMatch.score}
                                            </span>
                                            <span className="text-gray-500 dark:text-gray-500 ml-1 font-normal text-xs">
                                                vs {activity.lastMatch.opponent}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-gray-400 font-normal italic">Sin registros</span>
                                    )}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                                    Asistencia
                                </p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {stats?.attendance ? `${stats.attendance}%` : '—'}
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Actions Footer */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700/50 grid grid-cols-2 gap-3">
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        // TODO: Implement training creation flow
                        // toast.info('Próximamente')
                    }}
                    className="px-3 py-2.5 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-center flex items-center justify-center gap-2"
                >
                    + Entreno
                </button>
                <button
                    onClick={(e) => handleAction(e, `/matches/new?teamId=${team.id}`)}
                    className="px-3 py-2.5 text-sm font-medium text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors text-center flex items-center justify-center gap-2"
                >
                    + Partido
                </button>
            </div>
        </div>
    )
}
