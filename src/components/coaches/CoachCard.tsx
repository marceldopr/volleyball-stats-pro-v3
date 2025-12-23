import { User, Award } from 'lucide-react'
import { clsx } from 'clsx'
import type { CoachWithTeams } from '@/types/Coach'
import { Button } from '@/components/ui/Button'

interface CoachCardProps {
    coach: CoachWithTeams
    onViewProfile: () => void
    onAssignTeam: () => void
}

export function CoachCard({ coach, onViewProfile, onAssignTeam }: CoachCardProps) {
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
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-full">
            {/* Header - Centered Vertical */}
            <div className="p-6 flex flex-col items-center text-center border-b border-gray-100 dark:border-gray-700/50">
                <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-700/50 mb-3">
                    <User className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                </div>

                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 truncate w-full px-2">
                    {fullName}
                </h3>

                <div className="flex flex-wrap justify-center gap-2 mb-2">
                    <span className={clsx(
                        'text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap',
                        roleBadge.className
                    )}>
                        {roleBadge.label}
                    </span>
                    {coach.status === 'inactive' && (
                        <span className="text-xs text-red-500 dark:text-red-400 font-medium px-2 py-0.5 bg-red-50 dark:bg-red-900/20 rounded-full">
                            Inactivo
                        </span>
                    )}
                </div>

                {coach.email && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate w-full px-2">
                        {coach.email}
                    </p>
                )}
            </div>

            {/* Body: Teams & Stats */}
            <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-center justify-center gap-2 mb-4">
                    <Award className="w-4 h-4 text-gray-400" />
                    <span className={clsx(
                        'text-xs font-semibold px-2 py-0.5 rounded-full',
                        workloadBadge.className
                    )}>
                        {workloadBadge.label}
                    </span>
                </div>

                <div className="flex-1">
                    {teamCount === 0 ? (
                        <div className="text-center py-4">
                            <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                                Sin equipos asignados
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-wrap justify-center gap-2 mb-4 content-start">
                            {coach.current_teams.map(team => (
                                <div
                                    key={team.id}
                                    className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30 rounded-md px-2 py-1"
                                >
                                    <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                                        {team.team_name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 mt-auto pt-4 border-t border-gray-100 dark:border-gray-700/50">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={onAssignTeam}
                        className="w-full text-xs"
                    >
                        Asignar Equipo
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={onViewProfile}
                        className="w-full text-xs"
                    >
                        Ver Ficha
                    </Button>
                </div>
            </div>
        </div>
    )
}
