import { User, Award } from 'lucide-react'
import { clsx } from 'clsx'
import type { CoachWithTeams } from '@/types/Coach'
import { Button } from '@/components/ui/Button'

interface CoachCardProps {
    coach: CoachWithTeams
    onViewProfile: () => void
}

export function CoachCard({ coach, onViewProfile }: CoachCardProps) {
    const fullName = `${coach.first_name} ${coach.last_name}`
    const teamCount = coach.current_teams.length

    // Role badge (if profile_id exists, check DT role from profile)
    const getRoleBadge = () => {
        // For now, simplified - you can enhance by fetching profile role
        return {
            label: 'Entrenador',
            className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 border border-blue-200 dark:border-blue-700'
        }
    }

    // Workload badge
    const getWorkloadBadge = () => {
        if (teamCount === 0) {
            return {
                label: '0 equipos',
                className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            }
        } else if (teamCount <= 2) {
            return {
                label: `${teamCount} ${teamCount === 1 ? 'equipo' : 'equipos'}`,
                className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
            }
        } else if (teamCount <= 4) {
            return {
                label: `${teamCount} equipos`,
                className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
            }
        } else {
            return {
                label: `${teamCount} equipos`,
                className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
            }
        }
    }

    const roleBadge = getRoleBadge()
    const workloadBadge = getWorkloadBadge()

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 dark:border-gray-700/50">
                <div className="flex items-start gap-3 mb-3">
                    <div className="mt-1 p-2 rounded-full bg-gray-100 dark:bg-gray-700/50">
                        <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {fullName}
                            </h3>
                            <span className={clsx(
                                'text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap',
                                roleBadge.className
                            )}>
                                {roleBadge.label}
                            </span>
                        </div>
                        {coach.email && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {coach.email}
                            </p>
                        )}
                        {coach.status === 'inactive' && (
                            <span className="text-xs text-red-500 dark:text-red-400 font-medium">
                                Inactivo
                            </span>
                        )}
                    </div>
                </div>

                {/* Workload */}
                <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Carga:</span>
                    <span className={clsx(
                        'text-xs font-semibold px-2 py-0.5 rounded-full',
                        workloadBadge.className
                    )}>
                        {workloadBadge.label}
                    </span>
                </div>
            </div>

            {/* Body: Teams */}
            <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Equipos asignados
                    </p>
                </div>

                {teamCount === 0 ? (
                    <div className="text-center py-6">
                        <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                            Sin equipos asignados
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {coach.current_teams.map(team => (
                            <div
                                key={team.id}
                                className="flex items-center gap-2 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border border-orange-200 dark:border-orange-700/50 rounded-lg px-3 py-2"
                            >
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {team.team_name}
                                </span>
                                {team.role_in_team !== 'head' && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        ({team.role_in_team})
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Action Button */}
                <Button
                    variant="primary"
                    size="sm"
                    onClick={onViewProfile}
                    className="w-full"
                >
                    Ver Ficha
                </Button>
            </div>
        </div>
    )
}
